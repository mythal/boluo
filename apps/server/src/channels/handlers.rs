use super::Channel;
use super::api::{
    ChannelMembers, ChannelWithMaybeMember, CreateChannel, EditChannel, EditChannelTopic,
    GrantOrRemoveChannelMaster,
};
use super::models::{ChannelMember, members_attach_user};
use crate::channels::api::{
    AddChannelMember, ChannelMemberWithUser, ChannelWithMember, ChannelWithRelated,
    CheckChannelName, EditChannelMember, Export, GrantOrRevoke, JoinChannel, KickFromChannel,
};
use crate::channels::models::{ChannelType, Member};
use crate::csrf::{authenticate, authenticate_optional};
use crate::error::{AppError, Find};
use crate::events::Update;
use crate::interface::{self, IdQuery, missing, ok_response, parse_body, parse_query, response};
use crate::messages::Message;
use crate::session::Session;
use crate::spaces::{Space, SpaceMember};
use hyper::Request;
use hyper::body::Body;
use std::collections::HashMap;
use uuid::Uuid;

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
    let query: IdQuery = parse_query(req.uri())?;

    Channel::get_by_id(&ctx.db, &query.id).await.or_not_found()
}

async fn push_members(
    ctx: &crate::context::AppContext,
    space_id: Uuid,
    channel_id: Uuid,
) -> Result<(), sqlx::Error> {
    let mut conn = ctx.db.acquire().await?;
    let members = Member::get_by_channel_from_db(&mut *conn, space_id, channel_id).await?;
    let members = members_attach_user(&mut *conn, members).await?;
    Update::push_members(space_id, channel_id, members);
    Ok(())
}

async fn members<B: Body>(
    ctx: &crate::context::AppContext,
    req: Request<B>,
) -> Result<ChannelMembers, AppError> {
    let query: IdQuery = parse_query(req.uri())?;

    let mut conn = ctx.db.acquire().await?;
    let channel = Channel::get_by_id(&mut *conn, &query.id)
        .await
        .or_not_found()?;
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
    let mut members = Member::get_by_channel(&mut *conn, channel.space_id, channel.id).await?;

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
        let space = Space::get_by_id(&mut *conn, &channel.space_id).await?;
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
        members: members_attach_user(&mut *conn, members).await?,
        // Deprecated
        color_list: HashMap::new(),
        heartbeat_map: HashMap::new(),
        self_index,
    })
}

async fn query_with_related(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<ChannelWithRelated, AppError> {
    let query: IdQuery = parse_query(req.uri())?;
    let session = authenticate(&req).await.ok();

    let mut conn = ctx.db.acquire().await?;
    let (mut channel, space) = Channel::get_with_space(&mut *conn, &query.id)
        .await
        .or_not_found()?;
    let mut members = Member::get_by_channel(&mut *conn, channel.space_id, channel.id).await?;
    let my_member: Option<&Member> = session.and_then(|session| {
        members
            .iter()
            .find(|member| member.channel.user_id == session.user_id)
    });

    let color_list = ChannelMember::get_color_list(&mut *conn, &channel.id).await?;

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
        color_list,
        heartbeat_map: HashMap::new(),
    };
    Ok(with_related)
}

async fn create(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<ChannelWithMember, AppError> {
    let session = authenticate(&req).await?;
    let CreateChannel {
        space_id,
        name,
        character_name,
        default_dice_type,
        is_public,
        _type,
    } = interface::parse_body(req).await?;

    let mut trans = ctx.db.begin().await?;
    Space::get_by_id(&mut *trans, &space_id)
        .await?
        .ok_or_else(|| AppError::BadRequest("The space not found".to_string()))?;
    admin_only(&mut *trans, &session.user_id, &space_id).await?;

    let channel = Channel::create(
        &mut *trans,
        &space_id,
        &name,
        is_public,
        default_dice_type.as_deref(),
        _type.unwrap_or(ChannelType::InGame),
    )
    .await?;
    let channel_member = ChannelMember::add_user(
        &mut *trans,
        session.user_id,
        channel.id,
        channel.space_id,
        &character_name,
        true,
    )
    .await?;
    trans.commit().await?;
    let joined = ChannelWithMember {
        channel,
        member: channel_member,
    };
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
    let push_members = !(grant_masters.is_empty() && remove_masters.is_empty());
    for user_id in grant_masters {
        ChannelMember::set_master(&mut *trans, &user_id, &channel_id, channel.space_id, true)
            .await
            .ok();
    }
    for user_id in remove_masters {
        ChannelMember::set_master(&mut *trans, &user_id, &channel_id, channel.space_id, false)
            .await
            .ok();
    }
    trans.commit().await?;
    if push_members {
        let mut conn = ctx.db.acquire().await?;
        let members =
            Member::get_by_channel_from_db(&mut *conn, channel.space_id, channel_id).await?;
        let members = members_attach_user(&mut *conn, members).await?;
        Update::push_members(channel.space_id, channel_id, members);
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

    if !has_permission {
        if let Some(channel_member) =
            ChannelMember::get(&mut trans, session.user_id, channel.space_id, channel_id).await?
        {
            has_permission = channel_member.is_master;
        }
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

    trans.commit().await?;
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
    let channel = Channel::get_by_id(&ctx.db, &channel_id)
        .await
        .or_not_found()?;
    let mut trans = ctx.db.begin().await?;

    let space_member = SpaceMember::get_by_channel(&mut *trans, &session.user_id, &channel_id)
        .await
        .or_no_permission()?;
    if !space_member.is_admin {
        return Err(AppError::NoPermission("user is not admin".to_string()));
    }

    ChannelMember::set_master(
        &mut *trans,
        &user_id,
        &channel_id,
        channel.space_id,
        match grant_or_revoke {
            GrantOrRevoke::Grant => true,
            GrantOrRevoke::Revoke => false,
        },
    )
    .await
    .ok();
    trans.commit().await?;
    push_members(ctx, channel.space_id, channel_id).await?;
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
    let mut trans = ctx.db.begin().await?;

    let channel = Channel::get_by_id(&mut *trans, &channel_id)
        .await
        .or_not_found()?;

    ChannelMember::get(&mut trans, session.user_id, channel.space_id, channel_id)
        .await
        .or_no_permission()?;
    SpaceMember::get(&mut *trans, &session.user_id, &channel.space_id)
        .await
        .or_no_permission()?;
    let member = ChannelMember::add_user(
        &mut *trans,
        user_id,
        channel_id,
        channel.space_id,
        &character_name,
        false,
    )
    .await?;
    trans.commit().await?;
    push_members(ctx, channel.space_id, channel_id).await?;
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
    let channel = Channel::get_by_id(&ctx.db, &channel_id)
        .await
        .or_not_found()?;

    let mut trans = ctx.db.begin().await?;

    ChannelMember::get(&mut trans, session.user_id, channel.space_id, channel_id)
        .await
        .or_no_permission()?;

    let character_name = character_name.as_deref();
    let text_color = text_color.as_deref();
    let channel_member = ChannelMember::edit(
        &mut *trans,
        session.user_id,
        channel_id,
        channel.space_id,
        character_name,
        text_color,
    )
    .await?
    .or_not_found();
    trans.commit().await?;
    push_members(ctx, channel.space_id, channel_id).await?;
    channel_member
}

async fn all_members(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<Vec<ChannelMemberWithUser>, AppError> {
    let IdQuery { id } = parse_query(req.uri())?;

    ChannelMember::get_by_channel(&ctx.db, &id, true)
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
        channel.space_id,
        &character_name,
        false,
    )
    .await?;
    trans.commit().await?;
    push_members(ctx, channel.space_id, channel_id).await?;
    Ok(ChannelWithMember { channel, member })
}

async fn leave(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;
    let channel = Channel::get_by_id(&ctx.db, &id).await.or_not_found()?;
    ChannelMember::remove_user(&ctx.db, session.user_id, id, channel.space_id).await?;
    push_members(ctx, channel.space_id, id).await?;
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
    let mut trans = ctx.db.begin().await?;
    let space_member = SpaceMember::get(&mut *trans, &operator_user_id, &space_id)
        .await
        .or_no_permission()?;
    if !space_member.is_admin {
        let channel_member = ChannelMember::get(&mut trans, operator_user_id, space_id, channel_id)
            .await
            .or_no_permission()?;
        if !channel_member.is_master {
            return Err(AppError::NoPermission(
                "You have no permission to kick user from this channel.".to_string(),
            ));
        }
    }
    ChannelMember::remove_user(&mut *trans, user_to_be_kicked, channel_id, space_id).await?;
    trans.commit().await?;
    push_members(ctx, space_id, channel_id).await?;
    Ok(true)
}

async fn delete(
    ctx: &crate::context::AppContext,
    req: Request<impl Body>,
) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;

    let mut conn = ctx.db.acquire().await?;

    let channel = Channel::get_by_id(&mut *conn, &id).await.or_not_found()?;

    admin_only(&mut *conn, &session.user_id, &channel.space_id).await?;

    Channel::delete(&mut *conn, &id, &channel.space_id).await?;
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
    let mut conn = ctx.db.acquire().await?;
    let channels = Channel::get_by_space(&mut *conn, &space_id)
        .await
        .map_err(Into::<AppError>::into)?;

    let channels = if let Some(Session { user_id, .. }) = session {
        let is_admin = SpaceMember::get_by_user(&mut *conn, user_id)
            .await?
            .into_iter()
            .any(|space_member| space_member.space_id == space_id && space_member.is_admin);
        let joined_members: HashMap<Uuid, ChannelMember> =
            ChannelMember::get_by_user(&mut *conn, user_id)
                .await?
                .into_iter()
                .map(|member| (member.channel_id, member))
                .collect();

        channels
            .into_iter()
            .filter_map(|channel| {
                let member = joined_members.get(&channel.id).cloned();
                if channel.is_public || member.is_some() || is_admin {
                    Some(ChannelWithMaybeMember { channel, member })
                } else {
                    None
                }
            })
            .collect()
    } else {
        channels
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
    let Export { channel_id, after } = parse_query(req.uri())?;
    let session = authenticate(&req).await?;
    let mut trans = ctx.db.begin().await?;

    let channel = Channel::get_by_id(&mut *trans, &channel_id)
        .await?
        .or_not_found()?;

    let space_member = SpaceMember::get(&mut *trans, &session.user_id, &channel.space_id)
        .await
        .or_no_permission()?;
    let channel_member =
        ChannelMember::get(&mut trans, session.user_id, channel.space_id, channel_id).await?;
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
