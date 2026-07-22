use super::Channel;
use super::api::{
    ChannelMembers, ChannelWithMaybeMember, CreateChannel, EditChannel, EditChannelTopic,
    GrantOrRemoveChannelMaster,
};
use super::models::{ChannelMember, members_attach_user};
use crate::channels::api::{
    AddChannelMember, ChannelMemberWithUser, ChannelWithMember, ChannelWithRelated,
    CheckChannelName, EditChannelMember, Export, GrantOrRevoke, JoinChannel, KickFromChannel,
    QueryChannel,
};
use crate::channels::models::{ChannelType, Member};
use crate::committed_changes::CommittedChanges;
use crate::csrf::{authenticate, authenticate_optional};
use crate::error::{AppError, Find};
use crate::events::Update;
use crate::interface::{self, IdQuery, missing, ok_response, parse_body, parse_query, response};
use crate::messages::Message;
use crate::rate_limit;
use crate::session::Session;
use crate::spaces::{Space, SpaceMember};
use governor::{DefaultKeyedRateLimiter, RateLimiter};
use hyper::Request;
use hyper::body::Body;
use std::collections::HashMap;
use std::sync::LazyLock;
use uuid::Uuid;

static CREATE_CHANNEL_LIMITER: LazyLock<DefaultKeyedRateLimiter<Uuid>> = LazyLock::new(|| {
    RateLimiter::keyed(rate_limit::per_hour(
        rate_limit::CREATE_CHANNEL_USER_PER_HOUR,
    ))
});

pub fn start_rate_limiter_cleanup() {
    rate_limit::start_cleanup_task(
        || {
            CREATE_CHANNEL_LIMITER.retain_recent();
        },
        || {
            CREATE_CHANNEL_LIMITER.shrink_to_fit();
        },
    );
}

async fn admin_only<'c, T: sqlx::PgExecutor<'c>>(
    db: T,
    user_id: &Uuid,
    space_id: &Uuid,
) -> Result<(), AppError> {
    let member = SpaceMember::get(db, user_id, space_id)
        .await
        .or_no_permission()?;
    if member.is_admin {
        Ok(())
    } else {
        Err(AppError::NoPermission("You're not admin".to_string()))
    }
}

async fn query<B: Body>(
    ctx: &crate::context::AppContext,
    req: Request<B>,
) -> Result<Channel, AppError> {
    let QueryChannel { id, space_id } = parse_query(req.uri())?;
    query_channel(ctx, id, space_id).await
}

async fn query_channel(
    ctx: &crate::context::AppContext,
    id: Uuid,
    space_id: Option<Uuid>,
) -> Result<Channel, AppError> {
    if let Some(space_id) = space_id
        && let Some(snapshot) = ctx.space_store.loaded_snapshot_maybe_stale(space_id)
        && let Some(channel) = snapshot.channels.get(&id)
    {
        metrics::counter!("boluo_server_space_runtime_read_total", "result" => "hit").increment(1);
        return Ok(channel.clone());
    }
    let resolved = ctx
        .space_store
        .resolve_channel(id, space_id)
        .await?
        .or_not_found()?;
    if resolved.snapshot.is_some() {
        metrics::counter!("boluo_server_space_runtime_read_total", "result" => "hit").increment(1);
    } else {
        metrics::counter!("boluo_server_space_runtime_read_total", "result" => "fallback")
            .increment(1);
    }
    Ok(resolved.channel)
}

async fn push_refreshed_members(
    ctx: &crate::context::AppContext,
    space_id: Uuid,
    channel_id: Uuid,
    refreshed_members: Option<Vec<Member>>,
) {
    let Some(members) = refreshed_members else {
        return;
    };
    let result = members_attach_user(&ctx.db, members).await;
    match result {
        Ok(members) => Update::push_members(space_id, channel_id, members),
        Err(error) => {
            metrics::counter!(
                "boluo_server_post_commit_effect_failed_total",
                "effect" => "push_channel_members"
            )
            .increment(1);
            tracing::error!(
                %error,
                %space_id,
                %channel_id,
                "Failed to attach users and push members after database commit"
            );
        }
    }
}

async fn members<B: Body>(
    ctx: &crate::context::AppContext,
    req: Request<B>,
) -> Result<ChannelMembers, AppError> {
    let QueryChannel { id, space_id } = parse_query(req.uri())?;
    let resolved = ctx
        .space_store
        .resolve_channel(id, space_id)
        .await?
        .or_not_found()?;
    let mut channel = resolved.channel;
    let runtime_snapshot = resolved.snapshot;
    if let Some(snapshot) = &runtime_snapshot {
        channel = snapshot
            .channels
            .get(&channel.id)
            .cloned()
            .ok_or(AppError::NotFound("channel"))?;
    }
    let current_user_id = authenticate_optional(&req)
        .await?
        .map(|session| session.user_id);
    if !channel.is_public && current_user_id.is_none() {
        tracing::warn!(
            "A guest is trying to access a private channel: {:?}",
            channel.id
        );
        return Err(AppError::NoPermission(
            "You are not logged in and this is a private channel".to_string(),
        ));
    }
    let mut members = if let Some(snapshot) = &runtime_snapshot {
        snapshot
            .channel_members
            .get(&channel.id)
            .into_iter()
            .flat_map(|members| members.values())
            .filter_map(|member| {
                snapshot
                    .space_members
                    .get(&member.user_id)
                    .map(|space| Member {
                        channel: member.clone(),
                        space: space.clone(),
                    })
            })
            .collect()
    } else {
        Member::get_by_channel(&ctx.db, channel.space_id, channel.id).await?
    };

    let Ok((members, self_index)) = tokio::task::spawn_blocking(move || {
        members.sort_unstable_by(|a, b| {
            if !a.channel.character_name.is_empty() && b.channel.character_name.is_empty() {
                std::cmp::Ordering::Less
            } else if a.channel.character_name.is_empty() && !b.channel.character_name.is_empty() {
                std::cmp::Ordering::Greater
            } else {
                a.channel.join_date.cmp(&b.channel.join_date)
            }
        });
        let self_index: Option<usize> = current_user_id.and_then(|current_user_id| {
            members
                .iter()
                .position(|member| member.channel.user_id == current_user_id)
        });
        (members, self_index)
    })
    .await
    else {
        return Err(AppError::Unexpected(anyhow::anyhow!(
            "Failed to sort members"
        )));
    };

    if !channel.is_public && self_index.is_none() {
        let space = if let Some(snapshot) = runtime_snapshot {
            Some(snapshot.space())
        } else {
            Space::get_by_id(&ctx.db, &channel.space_id).await?
        };
        if let Some(space) = space
            && Some(space.owner_id) == current_user_id
        {
            // Allow the owner to access the private channel
        } else {
            tracing::warn!(
                user_id = ?current_user_id,
                channel_id = ?channel.id,
                "A user is trying to access a private channel"
            );
            return Err(AppError::NoPermission(
                "This is a private channel".to_string(),
            ));
        }
    }

    Ok(ChannelMembers {
        members: members_attach_user(&ctx.db, members).await?,
        // Deprecated, not used anymore
        color_list: HashMap::new(),
        heartbeat_map: HashMap::new(),
        self_index,
    })
}

async fn query_with_related(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<ChannelWithRelated, AppError> {
    let QueryChannel { id, space_id } = parse_query(req.uri())?;
    let session = authenticate(&req).await.ok();

    let resolved = ctx
        .space_store
        .resolve_channel(id, space_id)
        .await?
        .or_not_found()?;
    let mut conn = ctx.db.acquire().await?;
    let (mut channel, mut space, snapshot) = if let Some(snapshot) = resolved.snapshot {
        (resolved.channel, snapshot.space(), Some(snapshot))
    } else {
        let space = Space::get_by_id(&mut *conn, &resolved.channel.space_id)
            .await?
            .or_not_found()?;
        (resolved.channel, space, None)
    };
    let mut members = if let Some(snapshot) = &snapshot {
        let Some(snapshot_channel) = snapshot.channels.get(&channel.id) else {
            return Err(AppError::NotFound("channel"));
        };
        channel = snapshot_channel.clone();
        space = snapshot.space();
        snapshot
            .channel_members
            .get(&channel.id)
            .into_iter()
            .flat_map(|members| members.values())
            .filter_map(|member| {
                snapshot
                    .space_members
                    .get(&member.user_id)
                    .map(|space| Member {
                        channel: member.clone(),
                        space: space.clone(),
                    })
            })
            .collect()
    } else {
        Member::get_by_channel(&mut *conn, channel.space_id, channel.id).await?
    };
    let my_member: Option<&Member> = session.and_then(|session| {
        members
            .iter()
            .find(|member| member.channel.user_id == session.user_id)
    });

    if channel.is_public
        || my_member.is_some()
        || Some(space.owner_id) == session.map(|session| session.user_id)
    {
        // Has permission to access the channel
    } else {
        channel.topic = String::new();
        members.clear();
    }

    let with_related = ChannelWithRelated {
        channel,
        space,
        members: members_attach_user(&mut *conn, members).await?,
        // Deprecated, not used anymore
        color_list: HashMap::new(),
        heartbeat_map: HashMap::new(),
    };
    Ok(with_related)
}

async fn create_transactional<F>(
    ctx: &crate::context::AppContext,
    user_id: Uuid,
    payload: CreateChannel,
    before_commit: F,
) -> Result<ChannelWithMember, AppError>
where
    F: std::future::Future<Output = ()>,
{
    let CreateChannel {
        space_id,
        name,
        character_name,
        default_dice_type,
        is_public,
        _type,
    } = payload;

    let mutation = ctx.space_store.acquire_mutation(space_id).await?;
    let mut trans = ctx.db.begin().await?;
    Space::get_by_id(&mut *trans, &space_id)
        .await?
        .ok_or_else(|| AppError::BadRequest("The space not found".to_string()))?;
    admin_only(&mut *trans, &user_id, &space_id).await?;

    let channel = Channel::create(
        &mut *trans,
        &space_id,
        &name,
        is_public,
        default_dice_type.as_deref(),
        _type.unwrap_or(ChannelType::InGame),
    )
    .await?;
    let channel_member =
        ChannelMember::add_user(&mut *trans, user_id, channel.id, &character_name, true).await?;
    before_commit.await;
    let mutation = mutation.commit(trans).await?;
    let mut changes = CommittedChanges::default();
    changes.channel_created(&channel);
    changes.channel_member_added(channel.space_id, &channel_member);
    changes.apply_with_mutation(ctx, &mutation).await;
    Ok(ChannelWithMember {
        channel,
        member: channel_member,
    })
}

async fn create(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<ChannelWithMember, AppError> {
    let session = authenticate(&req).await?;
    CREATE_CHANNEL_LIMITER
        .check_key(&session.user_id)
        .map_err(|_| AppError::LimitExceeded("Too many channels, please try again later."))?;
    let payload = interface::parse_body::<CreateChannel>(req).await?;
    let space_id = payload.space_id;
    let joined =
        create_transactional(ctx, session.user_id, payload, std::future::ready(())).await?;
    Update::space_updated(ctx, space_id);
    Ok(joined)
}

async fn edit(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Channel, AppError> {
    let session = authenticate(&req).await?;
    let EditChannel {
        channel_id,
        name,
        topic,
        _type,
        default_dice_type,
        default_roll_command,
        grant_masters,
        remove_masters,
        is_public,
        is_document,
        is_archived,
    } = interface::parse_body(req).await?;

    let mutation_space_id = Channel::resolve_owning_space_id(&ctx.db, &channel_id)
        .await
        .or_not_found()?;
    let mutation = ctx.space_store.acquire_mutation(mutation_space_id).await?;
    let mut trans = ctx.db.begin().await?;

    let channel = Channel::get_by_id(&mut *trans, &channel_id)
        .await
        .or_not_found()?;

    let space = Space::get_by_id(&mut *trans, &channel.space_id)
        .await?
        .or_not_found()?;

    let space_member = SpaceMember::get(&mut *trans, &session.user_id, &channel.space_id).await?;
    let is_admin = space_member.map(|member| member.is_admin).unwrap_or(false);
    let is_owner = space.owner_id == session.user_id;
    if !is_admin && !is_owner {
        return Err(AppError::NoPermission(
            "user is not admin or owner".to_string(),
        ));
    }
    let channel = Channel::edit(
        &mut *trans,
        &channel_id,
        name.as_deref(),
        topic.as_deref(),
        default_dice_type.as_deref(),
        default_roll_command.as_deref(),
        is_public,
        is_document,
        _type,
        is_archived,
    )
    .await?;
    let should_push_members = !(grant_masters.is_empty() && remove_masters.is_empty());
    let mut changed_members = Vec::new();
    for user_id in grant_masters {
        if let Some(member) = ChannelMember::set_master(&mut *trans, &user_id, &channel_id, true)
            .await
            .ok()
            .flatten()
        {
            changed_members.push(member);
        }
    }
    for user_id in remove_masters {
        if let Some(member) = ChannelMember::set_master(&mut *trans, &user_id, &channel_id, false)
            .await
            .ok()
            .flatten()
        {
            changed_members.push(member);
        }
    }
    let mutation = mutation.commit(trans).await?;
    let mut changes = CommittedChanges::default();
    changes.channel_updated(&channel);
    for member in &changed_members {
        changes.channel_member_changed(channel.space_id, member);
    }
    let mut applied = changes.apply_with_mutation(ctx, &mutation).await;
    if should_push_members {
        let members = applied.take_channel_members(channel.space_id, channel_id);
        push_refreshed_members(ctx, channel.space_id, channel_id, members).await;
    }
    Update::channel_edited(channel.clone());
    Update::space_updated(ctx, channel.space_id);
    Ok(channel)
}

async fn edit_topic(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Channel, AppError> {
    let session = authenticate(&req).await?;
    let EditChannelTopic { channel_id, topic } = interface::parse_body(req).await?;

    let mutation_space_id = Channel::resolve_owning_space_id(&ctx.db, &channel_id)
        .await
        .or_not_found()?;
    let mutation = ctx.space_store.acquire_mutation(mutation_space_id).await?;
    let channel_member = ctx
        .space_store
        .resolve_channel_member(mutation_space_id, channel_id, session.user_id)
        .await?
        .map(|member| member.channel);
    let mut trans = ctx.db.begin().await?;

    let channel = Channel::get_by_id(&mut *trans, &channel_id)
        .await
        .or_not_found()?;

    let mut has_permission = false;
    if let Some(space_member) =
        SpaceMember::get(&mut *trans, &session.user_id, &channel.space_id).await?
    {
        has_permission = space_member.is_admin;
    }

    if !has_permission && let Some(channel_member) = channel_member {
        has_permission = channel_member.is_master;
    }

    if !has_permission {
        return Err(AppError::NoPermission(
            "You have no permission to edit this channel topic.".to_string(),
        ));
    }

    let updated = Channel::edit(
        &mut *trans,
        &channel_id,
        None,
        Some(topic.as_str()),
        None,
        None,
        None,
        None,
        None,
        None,
    )
    .await?;

    let mutation = mutation.commit(trans).await?;
    let mut changes = CommittedChanges::default();
    changes.channel_updated(&updated);
    changes.apply_with_mutation(ctx, &mutation).await;
    Update::channel_edited(updated.clone());
    Update::space_updated(ctx, updated.space_id);
    Ok(updated)
}

async fn edit_masters(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let GrantOrRemoveChannelMaster {
        channel_id,
        grant_or_revoke,
        user_id,
    } = interface::parse_body(req).await?;
    let space_id = Channel::resolve_owning_space_id(&ctx.db, &channel_id)
        .await
        .or_not_found()?;
    let mutation = ctx.space_store.acquire_mutation(space_id).await?;
    let mut trans = ctx.db.begin().await?;

    Channel::get_by_id(&mut *trans, &channel_id)
        .await
        .or_not_found()?;
    let space_member = SpaceMember::get_by_channel(&mut *trans, &session.user_id, &channel_id)
        .await
        .or_no_permission()?;
    if !space_member.is_admin {
        return Err(AppError::NoPermission("user is not admin".to_string()));
    }

    let changed_member = ChannelMember::set_master(
        &mut *trans,
        &user_id,
        &channel_id,
        match grant_or_revoke {
            GrantOrRevoke::Grant => true,
            GrantOrRevoke::Revoke => false,
        },
    )
    .await
    .ok();
    let mutation = mutation.commit(trans).await?;
    let mut changes = CommittedChanges::default();
    if let Some(Some(member)) = changed_member {
        changes.channel_member_changed(space_id, &member);
    }
    let mut applied = changes.apply_with_mutation(ctx, &mutation).await;
    let members = applied.take_channel_members(space_id, channel_id);
    push_refreshed_members(ctx, space_id, channel_id, members).await;
    Ok(true)
}

async fn add_member(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<ChannelWithMember, AppError> {
    let session = authenticate(&req).await?;
    let AddChannelMember {
        channel_id,
        user_id,
        character_name,
    } = parse_body(req).await?;
    let mutation_space_id = Channel::resolve_owning_space_id(&ctx.db, &channel_id)
        .await
        .or_not_found()?;
    let mutation = ctx.space_store.acquire_mutation(mutation_space_id).await?;
    ctx.space_store
        .resolve_channel_member(mutation_space_id, channel_id, session.user_id)
        .await?
        .or_no_permission()?;
    let mut trans = ctx.db.begin().await?;

    let channel = Channel::get_by_id(&mut *trans, &channel_id)
        .await
        .or_not_found()?;

    let member =
        ChannelMember::add_user(&mut *trans, user_id, channel_id, &character_name, false).await?;
    let mutation = mutation.commit(trans).await?;
    let mut changes = CommittedChanges::default();
    changes.channel_member_added(channel.space_id, &member);
    let mut applied = changes.apply_with_mutation(ctx, &mutation).await;
    let members = applied.take_channel_members(channel.space_id, channel_id);
    push_refreshed_members(ctx, channel.space_id, channel_id, members).await;
    Ok(ChannelWithMember { channel, member })
}

async fn edit_member(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<ChannelMember, AppError> {
    let session = authenticate(&req).await?;
    let EditChannelMember {
        channel_id,
        character_name,
        text_color,
    } = interface::parse_body(req).await?;
    let space_id = Channel::resolve_owning_space_id(&ctx.db, &channel_id)
        .await
        .or_not_found()?;

    let mutation = ctx.space_store.acquire_mutation(space_id).await?;
    ctx.space_store
        .resolve_channel_member(space_id, channel_id, session.user_id)
        .await?
        .or_no_permission()?;
    let mut trans = ctx.db.begin().await?;

    Channel::get_by_id(&mut *trans, &channel_id)
        .await
        .or_not_found()?;

    let character_name = character_name.as_deref();
    let text_color = text_color.as_deref();
    let channel_member = ChannelMember::edit(
        &mut *trans,
        session.user_id,
        channel_id,
        character_name,
        text_color,
    )
    .await?
    .or_not_found();
    let mutation = mutation.commit(trans).await?;
    let channel_member = channel_member?;
    let mut changes = CommittedChanges::default();
    changes.channel_member_changed(space_id, &channel_member);
    let mut applied = changes.apply_with_mutation(ctx, &mutation).await;
    let members = applied.take_channel_members(space_id, channel_id);
    push_refreshed_members(ctx, space_id, channel_id, members).await;
    Ok(channel_member)
}

async fn all_members(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<ChannelMemberWithUser>, AppError> {
    let QueryChannel { id, space_id } = parse_query(req.uri())?;

    let resolved = ctx
        .space_store
        .resolve_channel(id, space_id)
        .await?
        .or_not_found()?;
    ChannelMember::get_by_channel(&ctx.db, &resolved.channel.id, true)
        .await
        .map_err(Into::into)
}

async fn join(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<ChannelWithMember, AppError> {
    let session = authenticate(&req).await?;
    let JoinChannel {
        channel_id,
        character_name,
    } = parse_body(req).await?;
    let mutation_space_id = Channel::resolve_owning_space_id(&ctx.db, &channel_id)
        .await
        .or_not_found()?;
    let mutation = ctx.space_store.acquire_mutation(mutation_space_id).await?;
    let mut trans = ctx.db.begin().await?;

    let channel = Channel::get_by_id(&mut *trans, &channel_id)
        .await
        .or_not_found()?;
    if !channel.is_public {
        let space = Space::get_by_id(&mut *trans, &channel.space_id).await?;
        if let Some(space) = space
            && space.owner_id == session.user_id
        {
            // Allow the owner to join the private channel
        } else {
            tracing::warn!(
                user_id = %session.user_id,
                channel_id = %channel.id,
                "A user is trying to join a private channel"
            );
            return Err(AppError::NoPermission(
                "This is a private channel".to_string(),
            ));
        }
    }
    SpaceMember::get(&mut *trans, &session.user_id, &channel.space_id)
        .await
        .or_no_permission()?;
    let member = ChannelMember::add_user(
        &mut *trans,
        session.user_id,
        channel.id,
        &character_name,
        false,
    )
    .await?;
    let mutation = mutation.commit(trans).await?;
    let mut changes = CommittedChanges::default();
    changes.channel_member_added(channel.space_id, &member);
    let mut applied = changes.apply_with_mutation(ctx, &mutation).await;
    let members = applied.take_channel_members(channel.space_id, channel_id);
    push_refreshed_members(ctx, channel.space_id, channel_id, members).await;
    Ok(ChannelWithMember { channel, member })
}

async fn leave(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;
    let space_id = Channel::resolve_owning_space_id(&ctx.db, &id)
        .await
        .or_not_found()?;
    let mutation = ctx.space_store.acquire_mutation(space_id).await?;
    let mut trans = ctx.db.begin().await?;
    Channel::get_by_id(&mut *trans, &id).await.or_not_found()?;
    ChannelMember::remove_user(&mut *trans, session.user_id, id).await?;
    let mutation = mutation.commit(trans).await?;
    let mut changes = CommittedChanges::default();
    changes.channel_member_removed(space_id, id, session.user_id);
    let mut applied = changes.apply_with_mutation(ctx, &mutation).await;
    let members = applied.take_channel_members(space_id, id);
    push_refreshed_members(ctx, space_id, id, members).await;
    Ok(true)
}

async fn kick(ctx: &crate::context::AppContext, req: Request<impl Body>) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let KickFromChannel {
        space_id,
        channel_id,
        user_id: user_to_be_kicked,
    } = parse_query(req.uri())?;
    let operator_user_id = session.user_id;
    let owning_space_id = resolve_channel_mutation_space(ctx, channel_id, space_id).await?;
    let mutation = ctx.space_store.acquire_mutation(owning_space_id).await?;
    let channel_member = ctx
        .space_store
        .resolve_channel_member(owning_space_id, channel_id, operator_user_id)
        .await?
        .map(|member| member.channel);
    let mut trans = ctx.db.begin().await?;
    let space_member = SpaceMember::get(&mut *trans, &operator_user_id, &owning_space_id)
        .await
        .or_no_permission()?;
    if !space_member.is_admin {
        let channel_member = channel_member.or_no_permission()?;
        if !channel_member.is_master {
            return Err(AppError::NoPermission(
                "You have no permission to kick user from this channel.".to_string(),
            ));
        }
    }
    ChannelMember::remove_user(&mut *trans, user_to_be_kicked, channel_id).await?;
    let mutation = mutation.commit(trans).await?;
    let mut changes = CommittedChanges::default();
    changes.channel_member_removed(owning_space_id, channel_id, user_to_be_kicked);
    let mut applied = changes.apply_with_mutation(ctx, &mutation).await;
    let members = applied.take_channel_members(owning_space_id, channel_id);
    push_refreshed_members(ctx, owning_space_id, channel_id, members).await;
    Ok(true)
}

async fn resolve_channel_mutation_space(
    ctx: &crate::context::AppContext,
    channel_id: Uuid,
    requested_space_id: Uuid,
) -> Result<Uuid, AppError> {
    let owning_space_id = Channel::resolve_owning_space_id(&ctx.db, &channel_id)
        .await
        .or_not_found()?;
    if owning_space_id != requested_space_id {
        return Err(AppError::BadRequest(
            "spaceId does not match the channel's Space".to_string(),
        ));
    }
    Ok(owning_space_id)
}

async fn delete(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;

    let mutation_space_id = Channel::resolve_owning_space_id(&ctx.db, &id)
        .await
        .or_not_found()?;
    let mutation = ctx.space_store.acquire_mutation(mutation_space_id).await?;
    let mut trans = ctx.db.begin().await?;

    let channel = Channel::get_by_id(&mut *trans, &id).await.or_not_found()?;

    admin_only(&mut *trans, &session.user_id, &channel.space_id).await?;

    if !Channel::delete(&mut trans, &id).await? {
        return Err(AppError::NotFound("channel"));
    }
    let mutation = mutation.commit(trans).await?;
    let mut changes = CommittedChanges::default();
    changes.channel_deleted(channel.space_id, id);
    changes.apply_with_mutation(ctx, &mutation).await;
    tracing::info!("channel {} was deleted.", &id);
    Update::channel_deleted(channel.space_id, id);
    Update::space_updated(ctx, channel.space_id);
    Ok(true)
}

async fn by_space(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<ChannelWithMaybeMember>, AppError> {
    let IdQuery { id: space_id } = parse_query(req.uri())?;
    let session = authenticate(&req).await.ok();
    // This may extend access to old visible data, but cannot expose newer protected data.
    if let Some(snapshot) = ctx.space_store.loaded_snapshot_maybe_stale(space_id) {
        metrics::counter!("boluo_server_space_runtime_read_total", "result" => "hit").increment(1);
        let user_id = session.map(|session| session.user_id);
        let is_admin = user_id
            .and_then(|user_id| snapshot.space_members.get(&user_id))
            .is_some_and(|member| member.is_admin);
        let mut channels: Vec<_> = snapshot.channels.values().cloned().collect();
        channels.sort_unstable_by_key(|channel| channel.created);
        return Ok(channels
            .into_iter()
            .filter_map(|channel| {
                let member = user_id.and_then(|user_id| {
                    snapshot
                        .channel_members
                        .get(&channel.id)
                        .and_then(|members| members.get(&user_id))
                        .cloned()
                });
                (channel.is_public || member.is_some() || is_admin)
                    .then_some(ChannelWithMaybeMember { channel, member })
            })
            .collect());
    }
    metrics::counter!("boluo_server_space_runtime_read_total", "result" => "fallback").increment(1);
    let channels = if let Some(Session { user_id, .. }) = session {
        Channel::get_by_space_and_user(&ctx.db, &space_id, &user_id).await?
    } else {
        Channel::get_by_space(&ctx.db, &space_id)
            .await?
            .into_iter()
            .filter(|channel| channel.is_public)
            .map(|channel| ChannelWithMaybeMember {
                channel,
                member: None,
            })
            .collect()
    };
    Ok(channels)
}

async fn export(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<Message>, AppError> {
    let Export {
        channel_id,
        space_id,
        after,
    } = parse_query(req.uri())?;
    let session = authenticate(&req).await?;

    let resolved = ctx
        .space_store
        .resolve_channel(channel_id, space_id)
        .await?
        .or_not_found()?;
    let mut trans = ctx.db.begin().await?;
    let (channel, space_member, channel_member) = if let Some(snapshot) = resolved.snapshot {
        let space_member = snapshot
            .space_members
            .get(&session.user_id)
            .cloned()
            .or_no_permission()?;
        let channel_member = snapshot
            .channel_members
            .get(&channel_id)
            .and_then(|members| members.get(&session.user_id))
            .cloned();
        (resolved.channel, space_member, channel_member)
    } else {
        let channel = resolved.channel;
        let space_member = SpaceMember::get(&mut *trans, &session.user_id, &channel.space_id)
            .await
            .or_no_permission()?;
        let channel_member =
            ChannelMember::get(&mut trans, session.user_id, channel.space_id, channel_id).await?;
        (channel, space_member, channel_member)
    };
    if channel_member.is_none() && !space_member.is_admin {
        return Err(AppError::NoPermission(
            "user is not channel member".to_string(),
        ));
    }
    let hide = channel_member.is_none_or(|member| !member.is_master);
    Message::export(&mut *trans, &channel.id, hide, after)
        .await
        .map_err(Into::into)
}

pub async fn check_channel_name_exists(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<bool, AppError> {
    let CheckChannelName { space_id, name } = parse_query(req.uri())?;
    if let Some(snapshot) = ctx.space_store.loaded_snapshot_maybe_stale(space_id) {
        return Ok(snapshot
            .channels
            .values()
            .any(|channel| channel.name == name));
    }
    let channel = Channel::get_by_name(&ctx.db, space_id, &name).await?;
    Ok(channel.is_some())
}
pub async fn router(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
    path: &str,
) -> Result<hyper::Response<Vec<u8>>, AppError> {
    use hyper::Method;

    match (path, req.method().clone()) {
        ("/query", Method::GET) => response(query(ctx, req).await).await,
        ("/query_with_related", Method::GET) => response(query_with_related(ctx, req).await).await,
        ("/members", Method::GET) => response(members(ctx, req).await).await,
        ("/by_space", Method::GET) => response(by_space(ctx, req).await).await,
        ("/create", Method::POST) => response(create(ctx, req).await).await,
        ("/edit", Method::POST) => response(edit(ctx, req).await).await,
        ("/edit_topic", Method::POST) => response(edit_topic(ctx, req).await).await,
        ("/edit_master", Method::POST) => edit_masters(ctx, req).await.map(ok_response),
        ("/add_member", Method::POST) => response(add_member(ctx, req).await).await,
        ("/edit_member", Method::POST) => response(edit_member(ctx, req).await).await,
        ("/all_members", Method::GET) => response(all_members(ctx, req).await).await,
        ("/join", Method::POST) => response(join(ctx, req).await).await,
        ("/leave", Method::POST) => leave(ctx, req).await.map(ok_response),
        ("/kick", Method::POST) => kick(ctx, req).await.map(ok_response),
        ("/delete", Method::POST) => response(delete(ctx, req).await).await,
        ("/check_name", Method::GET) => check_channel_name_exists(ctx, req).await.map(ok_response),
        ("/export", Method::GET) => response(export(ctx, req).await).await,
        _ => missing(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::context::AppContext;
    use crate::spaces::{Space, SpaceMember};
    use crate::users::User;
    use bytes::Bytes;
    use http_body_util::Full;

    async fn create_test_user(pool: &sqlx::PgPool) -> User {
        let raw = Uuid::new_v4().simple().to_string();
        let username = format!("channel_handler_{}", &raw[..8]);
        let email = format!("channel_handler_{raw}@example.com");
        User::register(
            pool,
            &email,
            &username,
            "Channel Handler Tester",
            "ChannelHandlerPass123!",
        )
        .await
        .expect("failed to create test user")
    }

    async fn create_test_space(pool: &sqlx::PgPool, owner: &User) -> Space {
        let raw = Uuid::new_v4().simple().to_string();
        let space = Space::create(
            pool,
            format!("channel_handler_{}", &raw[..8]),
            &owner.id,
            "Channel handler test space".to_string(),
            None,
            Some("d20"),
        )
        .await
        .expect("failed to create test space");
        SpaceMember::add_admin(pool, &owner.id, &space.id)
            .await
            .expect("failed to grant owner admin");
        space
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_query_channel_without_space_hint(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool).await;
        let space = create_test_space(&pool, &owner).await;
        let channel = Channel::create(
            &pool,
            &space.id,
            "Old client query",
            true,
            Some("d20"),
            ChannelType::InGame,
        )
        .await
        .expect("failed to create channel");
        let ctx = AppContext::new(pool, None);

        let request = Request::builder()
            .uri(format!("/query?id={}", channel.id))
            .body(Full::new(Bytes::new()))
            .expect("failed to build old-client request");
        let without_hint = query(&ctx, request)
            .await
            .expect("failed to query channel without Space hint");
        assert_eq!(without_hint.id, channel.id);
        assert_eq!(without_hint.space_id, space.id);
        assert_eq!(without_hint.name, "Old client query");
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_query_with_related_does_not_require_a_second_connection(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool).await;
        let space = create_test_space(&pool, &owner).await;
        let channel = Channel::create(
            &pool,
            &space.id,
            "Single connection",
            true,
            Some("d20"),
            ChannelType::InGame,
        )
        .await
        .expect("failed to create channel");
        let single_connection_pool = sqlx::postgres::PgPoolOptions::new()
            .max_connections(1)
            .acquire_timeout(std::time::Duration::from_millis(250))
            .connect_with(pool.connect_options().as_ref().clone())
            .await
            .expect("failed to create single-connection pool");
        let ctx = AppContext::new(single_connection_pool, None);
        let request = Request::builder()
            .uri(format!("/query_with_related?id={}", channel.id))
            .body(Full::new(Bytes::new()))
            .expect("failed to build query request");

        let related = query_with_related(&ctx, request)
            .await
            .expect("query_with_related tried to acquire a second connection");
        assert_eq!(related.channel.id, channel.id);
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_channel_mutation_rejects_mismatched_space(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool).await;
        let owning_space = create_test_space(&pool, &owner).await;
        let unrelated_space = create_test_space(&pool, &owner).await;
        let channel = Channel::create(
            &pool,
            &owning_space.id,
            "Owned channel",
            true,
            Some("d20"),
            ChannelType::InGame,
        )
        .await
        .expect("failed to create channel");
        let ctx = AppContext::new(pool, None);

        let error = resolve_channel_mutation_space(&ctx, channel.id, unrelated_space.id)
            .await
            .expect_err("mismatched Space was accepted");
        assert!(
            matches!(error, AppError::BadRequest(_)),
            "unexpected mismatch error: {error}"
        );
        assert_eq!(
            resolve_channel_mutation_space(&ctx, channel.id, owning_space.id)
                .await
                .expect("owning Space was rejected"),
            owning_space.id
        );
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_created_channel_is_visible_after_transaction_commit(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool).await;
        let space = create_test_space(&pool, &owner).await;
        let initial_channels = Channel::get_by_space(&pool, &space.id)
            .await
            .expect("failed to prime the space channel cache");
        assert!(initial_channels.is_empty());
        let initial_members = ChannelMember::get_by_user(&pool, owner.id)
            .await
            .expect("failed to prime the channel member cache");
        assert!(initial_members.is_empty());

        let (reached_before_commit_tx, reached_before_commit_rx) = tokio::sync::oneshot::channel();
        let (continue_commit_tx, continue_commit_rx) = tokio::sync::oneshot::channel();
        let ctx = AppContext::new(pool.clone(), None);
        let payload = CreateChannel {
            space_id: space.id,
            name: "Visible after commit".to_string(),
            character_name: "GM".to_string(),
            default_dice_type: Some("d20".to_string()),
            is_public: true,
            _type: Some(ChannelType::InGame),
        };
        let create_task = tokio::spawn(async move {
            create_transactional(&ctx, owner.id, payload, async move {
                reached_before_commit_tx
                    .send(())
                    .expect("test receiver was dropped");
                continue_commit_rx
                    .await
                    .expect("commit release sender was dropped");
            })
            .await
        });

        reached_before_commit_rx
            .await
            .expect("channel creation did not reach the commit barrier");
        let before_commit = Channel::get_by_space(&pool, &space.id)
            .await
            .expect("failed to reload channels before commit");
        assert!(
            before_commit.is_empty(),
            "another connection observed an uncommitted channel"
        );
        let members_before_commit = ChannelMember::get_by_user(&pool, owner.id)
            .await
            .expect("failed to reload channel memberships before commit");
        assert!(
            members_before_commit.is_empty(),
            "another connection observed an uncommitted channel membership"
        );

        continue_commit_tx
            .send(())
            .expect("channel creation task was dropped");
        let created = create_task
            .await
            .expect("channel creation task panicked")
            .expect("channel creation failed");
        let after_commit = Channel::get_by_space(&pool, &space.id)
            .await
            .expect("failed to load channels after commit");
        assert!(
            after_commit
                .iter()
                .any(|channel| channel.id == created.channel.id),
            "the committed channel was hidden by a stale space channel cache"
        );
        let memberships_after_commit = ChannelMember::get_by_user(&pool, owner.id)
            .await
            .expect("failed to load channel memberships after commit");
        assert!(
            memberships_after_commit
                .iter()
                .any(|member| member.channel_id == created.channel.id),
            "the committed member was hidden by a stale channel member cache"
        );
        let members = Member::get_by_channel(&pool, space.id, created.channel.id)
            .await
            .expect("failed to load committed channel members");
        assert!(
            members
                .iter()
                .any(|member| member.channel.user_id == owner.id),
            "the committed channel member was not applied to mailbox state"
        );
    }
}
