use super::Message;
use super::api::{EditMessage, NewMessage};
use crate::channels::{Channel, ChannelMember};
use crate::csrf::authenticate;
use crate::error::{AppError, Find};
use crate::events::Update;
use crate::interface;
use crate::interface::{Response, missing, ok_response, parse_query, response};
use crate::messages::api::{
    GetMessagesByChannel, MessageIdQuery, MoveMessageBetween, SearchDirection, SearchFilter,
    SearchMessagesParams, SearchMessagesResult, SearchNameFilter,
};
use crate::notify;
use crate::rate_limit;
use crate::spaces::SpaceMember;
use governor::{DefaultKeyedRateLimiter, RateLimiter};
use hyper::Request;
use hyper::body::Body;
use std::sync::LazyLock;
use uuid::Uuid;

static SEND_MESSAGE_LIMITER: LazyLock<DefaultKeyedRateLimiter<Uuid>> = LazyLock::new(|| {
    RateLimiter::keyed(rate_limit::per_minute(
        rate_limit::SEND_MESSAGE_USER_PER_MINUTE,
    ))
});

pub fn start_rate_limiter_cleanup() {
    rate_limit::start_cleanup_task(
        || {
            SEND_MESSAGE_LIMITER.retain_recent();
        },
        || {
            SEND_MESSAGE_LIMITER.shrink_to_fit();
        },
    );
}

async fn send(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Message, AppError> {
    let start_time = std::time::Instant::now();
    let session = authenticate(&req).await?;
    SEND_MESSAGE_LIMITER
        .check_key(&session.user_id)
        .map_err(|_| AppError::LimitExceeded("Too many messages, please try again later."))?;
    let new_message = interface::parse_large_body::<NewMessage>(req).await?;
    let NewMessage {
        message_id: _,
        preview_id,
        channel_id,
        space_id,
        name,
        text,
        entities,
        in_game,
        is_action,
        media_id,
        whisper_to_users,
        pos: request_pos,
        color,
    } = *new_message;
    let resolved = ctx
        .space_store
        .resolve_channel(channel_id, space_id)
        .await?
        .or_not_found()?;
    let (channel, channel_member, space_member) = if let Some(snapshot) = resolved.snapshot {
        let channel_member = snapshot
            .channel_members
            .get(&channel_id)
            .and_then(|members| members.get(&session.user_id))
            .cloned()
            .or_no_permission()?;
        let space_member = snapshot
            .space_members
            .get(&session.user_id)
            .cloned()
            .or_no_permission()?;
        (resolved.channel, channel_member, space_member)
    } else {
        let channel = resolved.channel;
        let (channel_member, space_member) = ChannelMember::get_with_space_member(
            &ctx.db,
            session.user_id,
            channel_id,
            &channel.space_id,
        )
        .await
        .or_no_permission()?;
        (channel, channel_member, space_member)
    };
    let message = Message::create(
        &ctx.db,
        preview_id,
        channel_id,
        channel.space_id,
        &session.user_id,
        &channel_member.character_name,
        &name,
        &text,
        entities,
        in_game,
        is_action,
        channel_member.is_master,
        whisper_to_users,
        media_id,
        request_pos,
        color,
    )
    .await
    .inspect_err(|_| {
        metrics::counter!("boluo_server_messages_created_failed_total").increment(1);
    })?;
    notify::space_activity(&ctx.space_store, channel.space_id, Some(message.created));
    Update::new_message(space_member.space_id, message.clone(), preview_id).await;

    metrics::counter!("boluo_server_messages_created_total").increment(1);
    metrics::histogram!("boluo_server_messages_create_duration_ms")
        .record(start_time.elapsed().as_millis() as f64);
    Ok(message)
}

async fn edit(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Message, AppError> {
    let start_time = std::time::Instant::now();
    let session = authenticate(&req).await?;
    let edit_message = interface::parse_large_body::<EditMessage>(req).await?;
    let EditMessage {
        message_id,
        name,
        text,
        entities,
        in_game,
        is_action,
        media_id,
        color,
        expect_modified,
    } = *edit_message;
    let text = &*text;
    let name = &*name;
    let edit_outcome = Message::edit(
        &ctx.db,
        session.user_id,
        name,
        &message_id,
        text,
        entities,
        in_game,
        is_action,
        media_id,
        color,
        expect_modified,
    )
    .await?;
    let (edited_message, space_id) = match edit_outcome {
        super::models::MessageEditOutcome::Updated { message, space_id } => (message, space_id),
        super::models::MessageEditOutcome::MessageNotFound => {
            return Err(AppError::NotFound("Message"));
        }
        super::models::MessageEditOutcome::ChannelNotFound => {
            return Err(AppError::NotFound("channel"));
        }
        super::models::MessageEditOutcome::NoPermission => {
            return Err(AppError::NoPermission("user id dismatch".to_string()));
        }
        super::models::MessageEditOutcome::Conflict => {
            return Err(AppError::Conflict(
                "The message was edited elsewhere before this edit was submitted.".to_string(),
            ));
        }
    };
    metrics::counter!("boluo_server_messages_edited_total").increment(1);
    Update::message_edited(space_id, edited_message.clone(), edited_message.pos).await;
    metrics::histogram!("boluo_server_messages_edit_duration_ms")
        .record(start_time.elapsed().as_millis() as f64);
    Ok(edited_message)
}

async fn move_between(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let MoveMessageBetween {
        message_id,
        channel_id,
        range,
        expect_pos,
    } = interface::parse_body(req).await?;

    if range == (None, None) {
        return Err(AppError::BadRequest(
            "a and b cannot both be null".to_string(),
        ));
    }
    let move_outcome = Message::move_between(
        &ctx.db,
        session.user_id,
        &message_id,
        channel_id,
        range,
        expect_pos,
    )
    .await?;
    let (mut moved_message, space_id, old_pos) = match move_outcome {
        super::models::MessageMoveOutcome::Moved {
            message,
            space_id,
            old_pos,
        } => (message, space_id, old_pos),
        super::models::MessageMoveOutcome::MessageNotFound => {
            return Err(AppError::NotFound("Message"));
        }
        super::models::MessageMoveOutcome::ChannelMismatch => {
            return Err(AppError::BadRequest(
                "channelId does not match message channel".to_string(),
            ));
        }
        super::models::MessageMoveOutcome::ChannelNotFound => {
            return Err(AppError::NotFound("channel"));
        }
        super::models::MessageMoveOutcome::NoPermission => {
            return Err(AppError::NoPermission(
                "Only the master can move other's messages.".to_string(),
            ));
        }
        super::models::MessageMoveOutcome::PositionChanged => {
            return Err(AppError::BadRequest(
                "The message already moved".to_string(),
            ));
        }
    };
    if moved_message.whisper_to_users.is_some() {
        moved_message.hide(None);
    }
    Update::message_edited(space_id, moved_message, old_pos).await;
    metrics::counter!("boluo_server_messages_moved_total").increment(1);
    Ok(true)
}

async fn query(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Message, AppError> {
    let interface::IdQuery { id } = interface::parse_query(req.uri())?;
    let user_id = authenticate(&req).await.ok().map(|session| session.user_id);
    Message::get(&ctx.db, &id, user_id.as_ref())
        .await
        .or_not_found()
}

async fn resolve_space_member_cache_first(
    ctx: &crate::context::AppContext,
    user_id: Uuid,
    channel_id: Uuid,
    space_id: Option<Uuid>,
) -> Result<(Uuid, SpaceMember), AppError> {
    if let Some(space_id) = space_id
        && let Some(snapshot) = ctx
            .space_store
            .loaded_authoritative_snapshot_after_wait(space_id)
            .await
        && snapshot.channels.contains_key(&channel_id)
    {
        let member = snapshot
            .space_members
            .get(&user_id)
            .cloned()
            .or_no_permission()?;
        return Ok((space_id, member));
    }

    let member = SpaceMember::get_by_channel(&ctx.db, &user_id, &channel_id)
        .await
        .or_no_permission()?;
    Ok((member.space_id, member))
}

async fn resolve_channel_member_cache_first(
    ctx: &crate::context::AppContext,
    user_id: Uuid,
    channel_id: Uuid,
    space_id: Option<Uuid>,
) -> Result<(Channel, ChannelMember), AppError> {
    if let Some(space_id) = space_id
        && let Some(snapshot) = ctx
            .space_store
            .loaded_authoritative_snapshot_after_wait(space_id)
            .await
        && snapshot.channels.contains_key(&channel_id)
    {
        let channel = snapshot.channels.get(&channel_id).cloned().or_not_found()?;
        let member = snapshot
            .channel_member(channel_id, user_id)
            .map(|member| member.channel)
            .or_no_permission()?;
        return Ok((channel, member));
    }

    let channel = Channel::get_by_id(&ctx.db, &channel_id)
        .await
        .or_not_found()?;
    let member =
        ChannelMember::get_with_space_member(&ctx.db, user_id, channel_id, &channel.space_id)
            .await?
            .map(|(channel_member, _)| channel_member)
            .or_no_permission()?;
    Ok((channel, member))
}

async fn delete(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Message, AppError> {
    let session = authenticate(&req).await?;
    let MessageIdQuery { id, space_id } = interface::parse_query(req.uri())?;
    let message = Message::get(&ctx.db, &id, Some(&session.user_id))
        .await
        .or_not_found()?;
    let (space_id, space_member) =
        resolve_space_member_cache_first(ctx, session.user_id, message.channel_id, space_id)
            .await?;
    if !space_member.is_admin && message.sender_id != session.user_id {
        return Err(AppError::NoPermission("user id mismatch".to_string()));
    }
    Message::delete(&ctx.db, &id).await?;
    Update::message_deleted(space_id, message.channel_id, message.id, message.pos).await;
    crate::messages::MESSAGE_POSITIONS.cancel(message.channel_id, message.id);
    metrics::counter!("boluo_server_messages_deleted_total").increment(1);
    Ok(message)
}

async fn toggle_fold(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Message, AppError> {
    let session = authenticate(&req).await?;
    let MessageIdQuery { id, space_id } = interface::parse_query(req.uri())?;
    let message = Message::get(&ctx.db, &id, Some(&session.user_id))
        .await
        .or_not_found()?;
    let (channel, channel_member) =
        resolve_channel_member_cache_first(ctx, session.user_id, message.channel_id, space_id)
            .await?;
    if !channel.is_document && message.sender_id != session.user_id && !channel_member.is_master {
        return Err(AppError::NoPermission("user id dismatch".to_string()));
    }
    let edited_message = Message::set_folded(&ctx.db, &message.id, !message.folded)
        .await?
        .or_not_found()?;
    let mut event_message = edited_message.clone();
    event_message.hide(None);
    Update::message_edited(channel.space_id, event_message, message.pos).await;
    metrics::counter!("boluo_server_messages_folded_total").increment(1);
    Ok(edited_message)
}

async fn by_channel(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<Message>, AppError> {
    let GetMessagesByChannel {
        channel_id,
        space_id,
        limit,
        before,
    } = parse_query(req.uri())?;

    let session = authenticate(&req).await;
    let current_user_id = session.as_ref().ok().map(|session| session.user_id);
    let resolved = ctx
        .space_store
        .resolve_channel(channel_id, space_id)
        .await?
        .or_not_found()?;
    let channel = resolved.channel;
    let used_snapshot = resolved.snapshot;
    let mut conn = ctx.db.acquire().await?;
    if !channel.is_public {
        let user_id = session?.user_id;
        if let Some(snapshot) = used_snapshot {
            snapshot
                .channel_members
                .get(&channel_id)
                .and_then(|members| members.get(&user_id))
                .or_no_permission()?;
        } else {
            ChannelMember::get(&mut conn, user_id, channel.space_id, channel_id)
                .await
                .or_no_permission()?;
        }
    }
    let limit = limit.unwrap_or(128);
    Message::get_by_channel(
        &mut *conn,
        &channel_id,
        before,
        limit,
        current_user_id.as_ref(),
    )
    .await
    .map_err(Into::into)
}

async fn search(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<SearchMessagesResult, AppError> {
    let SearchMessagesParams {
        channel_id,
        space_id,
        keyword,
        pos,
        direction,
        include_archived,
        filter,
        name_filter,
    } = parse_query(req.uri())?;

    const KEYWORD_MAX_LEN: usize = 100;
    let normalized_keyword = keyword.trim();
    if normalized_keyword.is_empty() {
        return Err(AppError::BadRequest("keyword is empty".to_string()));
    }
    if normalized_keyword.len() > KEYWORD_MAX_LEN {
        return Err(AppError::BadRequest(format!(
            "keyword is too long (max {})",
            KEYWORD_MAX_LEN
        )));
    }
    let tokens: Vec<String> = normalized_keyword
        .split_whitespace()
        .map(|token| token.to_lowercase())
        .collect();
    if tokens.is_empty() {
        return Err(AppError::BadRequest("keyword is empty".to_string()));
    }
    const WINDOW_SIZE: i64 = 200;

    let session = authenticate(&req).await;
    let current_user_id = session.as_ref().ok().map(|session| session.user_id);
    let resolved = ctx
        .space_store
        .resolve_channel(channel_id, space_id)
        .await?
        .or_not_found()?;
    let channel = resolved.channel;
    let used_snapshot = resolved.snapshot;
    let mut conn = ctx.db.acquire().await?;
    if !channel.is_public {
        let user_id = session?.user_id;
        if let Some(snapshot) = used_snapshot {
            snapshot
                .channel_members
                .get(&channel_id)
                .and_then(|members| members.get(&user_id))
                .or_no_permission()?;
        } else {
            ChannelMember::get(&mut conn, user_id, channel.space_id, channel_id)
                .await
                .or_no_permission()?;
        }
    }

    let window_messages = match direction {
        SearchDirection::Asc => Message::get_after_pos(
            &mut *conn,
            &channel_id,
            pos,
            WINDOW_SIZE,
            current_user_id.as_ref(),
        )
        .await
        .map_err(Into::<AppError>::into)?,
        SearchDirection::Desc => {
            Message::get_by_channel(
                &mut *conn,
                &channel_id,
                pos,
                WINDOW_SIZE,
                current_user_id.as_ref(),
            )
            .await?
        }
    };
    std::mem::drop(conn);

    let scanned = window_messages.len();
    let next_pos = if scanned as i64 == WINDOW_SIZE {
        window_messages.last().map(|message| message.pos)
    } else {
        None
    };

    let filtered: Vec<Message> = window_messages
        .into_iter()
        .filter(|message| {
            if !include_archived && message.folded {
                return false;
            }
            let in_filter = match filter {
                SearchFilter::All => true,
                SearchFilter::InGame => message.in_game,
                SearchFilter::OutOfGame => !message.in_game,
            };
            if !in_filter {
                return false;
            }
            let lower_text = message.text.to_lowercase();
            let matches_text = tokens.iter().all(|token| lower_text.contains(token));
            let matches_name = tokens
                .iter()
                .all(|token| message.name.to_lowercase().contains(token));
            match name_filter {
                SearchNameFilter::All => matches_text || matches_name,
                SearchNameFilter::NameOnly => matches_name,
                SearchNameFilter::TextOnly => matches_text,
            }
        })
        .collect();
    let matched = filtered.len();
    let messages = filtered.into_iter().collect();

    Ok(SearchMessagesResult {
        messages,
        next_pos,
        scanned,
        matched,
    })
}

pub async fn router(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
    path: &str,
) -> Result<Response, AppError> {
    use hyper::Method;

    match (path, req.method().clone()) {
        ("/query", Method::GET) => response(query(ctx, req).await).await,
        ("/by_channel", Method::GET) => response(by_channel(ctx, req).await).await,
        ("/send", Method::POST) => response(send(ctx, req).await).await,
        ("/edit", Method::POST) => response(edit(ctx, req).await).await,
        ("/edit", Method::PUT) => response(edit(ctx, req).await).await,
        ("/edit", Method::PATCH) => response(edit(ctx, req).await).await,
        ("/move_between", Method::POST) => move_between(ctx, req).await.map(ok_response),
        ("/toggle_fold", Method::POST) => response(toggle_fold(ctx, req).await).await,
        ("/delete", Method::POST) => response(delete(ctx, req).await).await,
        ("/search", Method::GET) => response(search(ctx, req).await).await,
        _ => missing(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::channels::ChannelType;
    use crate::context::AppContext;
    use crate::spaces::Space;
    use crate::users::User;

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_message_member_queries_use_loaded_space_cache(pool: sqlx::PgPool) {
        let suffix = Uuid::new_v4().simple().to_string();
        let owner = User::register(
            &pool,
            &format!("message_cache_{}@example.com", &suffix[..8]),
            &format!("message_cache_{}", &suffix[..8]),
            "Message Cache Tester",
            "MessageCachePass123!",
        )
        .await
        .expect("failed to create message cache test user");
        let space = Space::create(
            &pool,
            format!("message_cache_{}", &suffix[..8]),
            &owner.id,
            "Message cache test Space".to_string(),
            None,
            Some("d20"),
        )
        .await
        .expect("failed to create message cache test Space");
        SpaceMember::add_admin(&pool, &owner.id, &space.id)
            .await
            .expect("failed to grant owner admin");
        let channel = Channel::create(
            &pool,
            &space.id,
            "Message cache test Channel",
            true,
            Some("d20"),
            ChannelType::InGame,
        )
        .await
        .expect("failed to create message cache test Channel");
        ChannelMember::add_user(&pool, owner.id, channel.id, "GM", true)
            .await
            .expect("failed to add owner to Channel");

        let single_connection_pool = sqlx::postgres::PgPoolOptions::new()
            .max_connections(1)
            .acquire_timeout(std::time::Duration::from_millis(100))
            .connect_with(pool.connect_options().as_ref().clone())
            .await
            .expect("failed to create single-connection pool");
        let ctx = AppContext::new(single_connection_pool.clone(), None);

        assert!(ctx.space_store.get(&space.id).is_none());
        let (cold_space_id, cold_space_member) =
            resolve_space_member_cache_first(&ctx, owner.id, channel.id, None)
                .await
                .expect("cold space member lookup failed");
        let (cold_channel, cold_channel_member) =
            resolve_channel_member_cache_first(&ctx, owner.id, channel.id, None)
                .await
                .expect("cold channel member lookup failed");
        assert_eq!(cold_space_id, space.id);
        assert_eq!(cold_space_member.user_id, owner.id);
        assert_eq!(cold_channel.id, channel.id);
        assert_eq!(cold_channel_member.user_id, owner.id);
        assert!(
            ctx.space_store.get(&space.id).is_none(),
            "cold member lookup unexpectedly loaded the Space runtime"
        );

        ctx.space_store
            .get_or_load(space.id)
            .await
            .expect("failed to load Space runtime");
        let _connection_blocker = single_connection_pool
            .acquire()
            .await
            .expect("failed to reserve the only database connection");

        let (_, cached_space_member) =
            resolve_space_member_cache_first(&ctx, owner.id, channel.id, Some(space.id))
                .await
                .expect("loaded space member lookup unexpectedly queried the database");
        let (_, cached_channel_member) =
            resolve_channel_member_cache_first(&ctx, owner.id, channel.id, Some(space.id))
                .await
                .expect("loaded channel member lookup unexpectedly queried the database");
        assert_eq!(cached_space_member, cold_space_member);
        assert_eq!(cached_channel_member, cold_channel_member);
    }
}
