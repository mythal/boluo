use super::Message;
use super::api::{EditMessage, NewMessage};
use crate::channels::{Channel, ChannelMember};
use crate::csrf::authenticate;
use crate::error::{AppError, Find};
use crate::events::Update;
use crate::interface;
use crate::interface::{Response, missing, ok_response, parse_query, response};
use crate::messages::api::{
    GetMessagesByChannel, MoveMessageBetween, SearchDirection, SearchFilter, SearchMessagesParams,
    SearchMessagesResult, SearchNameFilter,
};
use crate::spaces::SpaceMember;
use hyper::Request;
use hyper::body::Body;

async fn send(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Message, AppError> {
    let start_time = std::time::Instant::now();
    let session = authenticate(&req).await?;
    let new_message = interface::parse_large_body::<NewMessage>(req).await?;
    let NewMessage {
        message_id: _,
        preview_id,
        channel_id,
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
    let channel = Channel::get_by_id(&ctx.db, &channel_id)
        .await
        .or_not_found()?;
    let (channel_member, space_member) = ChannelMember::get_with_space_member(
        &ctx.db,
        session.user_id,
        channel_id,
        &channel.space_id,
    )
    .await
    .or_no_permission()?;
    let message = {
        let mut conn = ctx.db.acquire().await?;
        Message::create(
            &mut conn,
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
        })?
    };
    Update::new_message(space_member.space_id, message.clone(), preview_id);

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
    } = *edit_message;
    let mut trans = ctx.db.begin().await?;
    let message = Message::get(&mut *trans, &message_id, Some(&session.user_id))
        .await?
        .or_not_found()?;
    let channel = Channel::get_by_id(&mut *trans, &message.channel_id)
        .await
        .or_not_found()?;
    let (_, space_member) = ChannelMember::get_with_space_member(
        &mut *trans,
        session.user_id,
        message.channel_id,
        &channel.space_id,
    )
    .await
    .or_no_permission()?;
    if !channel.is_document && message.sender_id != session.user_id {
        return Err(AppError::NoPermission("user id dismatch".to_string()));
    }

    let text = &*text;
    let name = &*name;
    let edited_message = Message::edit(
        &mut *trans,
        name,
        &message_id,
        text,
        entities,
        in_game,
        is_action,
        media_id,
        color,
    )
    .await?
    .ok_or_else(|| unexpected!("The message had been delete."))?;
    trans.commit().await?;
    metrics::counter!("boluo_server_messages_edited_total").increment(1);
    Update::message_edited(
        space_member.space_id,
        edited_message.clone(),
        edited_message.pos,
    );
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

    let mut conn = ctx.db.acquire().await?;
    let message = Message::get(&mut *conn, &message_id, Some(&session.user_id))
        .await
        .or_not_found()?;
    crate::pos::CHANNEL_POS_MANAGER.submitted(
        channel_id,
        message_id,
        message.pos_p,
        message.pos_q,
        Some(message_id),
    );
    if let Some((expect_p, expect_q)) = expect_pos {
        if message.pos_p != expect_p || message.pos_q != expect_q {
            return Err(AppError::BadRequest(
                "The message already moved".to_string(),
            ));
        }
    }
    let channel = Channel::get_by_id(&mut *conn, &message.channel_id)
        .await
        .or_not_found()?;
    let channel_member = ChannelMember::get(
        &mut conn,
        session.user_id,
        channel.space_id,
        message.channel_id,
    )
    .await
    .or_no_permission()?;
    if !channel.is_document && !channel_member.is_master && message.sender_id != session.user_id {
        return Err(AppError::NoPermission(
            "Only the master can move other's messages.".to_string(),
        ));
    }
    let mut moved_message = match range {
        (None, None) => {
            return Err(AppError::BadRequest(
                "a and b cannot both be null".to_string(),
            ));
        }
        (Some(a), Some((0, _) | (1, 0)) | None) => {
            Message::move_bottom(&mut conn, &channel_id, &message_id, a)
                .await?
                .or_not_found()?
        }
        (Some((_, 0) | (0, 1)) | None, Some(b)) => {
            Message::move_above(&mut conn, &channel_id, &message_id, b)
                .await?
                .or_not_found()?
        }
        (Some(a), Some(b)) => Message::move_between(&mut conn, &message_id, channel_id, a, b)
            .await?
            .or_not_found()?,
    };
    if moved_message.whisper_to_users.is_some() {
        moved_message.hide(None);
    }
    Update::message_edited(channel.space_id, moved_message, message.pos);
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

async fn delete(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Message, AppError> {
    let session = authenticate(&req).await?;
    let interface::IdQuery { id } = interface::parse_query(req.uri())?;
    let mut conn = ctx.db.acquire().await?;
    let message = Message::get(&mut *conn, &id, Some(&session.user_id))
        .await
        .or_not_found()?;
    let space_member =
        SpaceMember::get_by_channel(&mut *conn, &session.user_id, &message.channel_id)
            .await
            .or_no_permission()?;
    if !space_member.is_admin && message.sender_id != session.user_id {
        return Err(AppError::NoPermission("user id mismatch".to_string()));
    }
    Message::delete(&mut *conn, &id).await?;
    Update::message_deleted(
        space_member.space_id,
        message.channel_id,
        message.id,
        message.pos,
    );
    crate::pos::CHANNEL_POS_MANAGER.cancel(message.channel_id, message.id);
    metrics::counter!("boluo_server_messages_deleted_total").increment(1);
    Ok(message)
}

async fn toggle_fold(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Message, AppError> {
    let session = authenticate(&req).await?;
    let interface::IdQuery { id } = interface::parse_query(req.uri())?;
    let mut conn = ctx.db.acquire().await?;
    let message = Message::get(&mut *conn, &id, Some(&session.user_id))
        .await
        .or_not_found()?;
    let channel = Channel::get_by_id(&mut *conn, &message.channel_id)
        .await
        .or_not_found()?;
    let channel_member = ChannelMember::get(
        &mut conn,
        session.user_id,
        channel.space_id,
        message.channel_id,
    )
    .await
    .or_no_permission()?;
    if !channel.is_document && message.sender_id != session.user_id && !channel_member.is_master {
        return Err(AppError::NoPermission("user id dismatch".to_string()));
    }
    let edited_message = Message::set_folded(&mut *conn, &message.id, !message.folded)
        .await?
        .ok_or_else(|| unexpected!("message not found"))?;
    Update::message_edited(channel.space_id, edited_message.clone(), message.pos);
    metrics::counter!("boluo_server_messages_folded_total").increment(1);
    Ok(edited_message)
}

async fn by_channel(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<Message>, AppError> {
    let GetMessagesByChannel {
        channel_id,
        limit,
        before,
    } = parse_query(req.uri())?;

    let channel = Channel::get_by_id(&ctx.db, &channel_id)
        .await
        .or_not_found()?;
    let session = authenticate(&req).await;
    let current_user_id = session.as_ref().ok().map(|session| session.user_id);
    let mut conn = ctx.db.acquire().await?;
    if !channel.is_public {
        ChannelMember::get(&mut conn, session?.user_id, channel.space_id, channel_id)
            .await
            .or_no_permission()?;
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

    let channel = Channel::get_by_id(&ctx.db, &channel_id)
        .await
        .or_not_found()?;
    let session = authenticate(&req).await;
    let current_user_id = session.as_ref().ok().map(|session| session.user_id);
    let mut conn = ctx.db.acquire().await?;
    if !channel.is_public {
        ChannelMember::get(&mut conn, session?.user_id, channel.space_id, channel_id)
            .await
            .or_no_permission()?;
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
