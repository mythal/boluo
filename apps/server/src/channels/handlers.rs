use super::api::{ChannelMembers, ChannelWithMaybeMember, CreateChannel, EditChannel, GrantOrRemoveChannelMaster};
use super::models::ChannelMember;
use super::Channel;
use crate::channels::api::{
    AddChannelMember, ChannelMemberWithUser, ChannelWithMember, ChannelWithRelated, CheckChannelName,
    EditChannelMember, Export, GrantOrRevoke, JoinChannel, KickFromChannel,
};
use crate::channels::models::{ChannelType, Member};
use crate::csrf::authenticate;
use crate::db;
use crate::error::{AppError, Find};
use crate::events::context::get_heartbeat_map;
use crate::events::Event;
use crate::interface::{self, missing, ok_response, parse_body, parse_query, IdQuery};
use crate::messages::Message;
use crate::session::Session;
use crate::spaces::{Space, SpaceMember};
use hyper::body::Body;
use hyper::Request;
use std::collections::HashMap;
use uuid::Uuid;

async fn admin_only<'c, T: sqlx::PgExecutor<'c>>(db: T, user_id: &Uuid, space_id: &Uuid) -> Result<(), AppError> {
    let member = SpaceMember::get(db, user_id, space_id).await.or_no_permission()?;
    if member.is_admin {
        Ok(())
    } else {
        Err(AppError::NoPermission("You're not admin".to_string()))
    }
}

async fn query<B: Body>(req: Request<B>) -> Result<Channel, AppError> {
    let query: IdQuery = parse_query(req.uri())?;

    Channel::get_by_id(&db::get().await, &query.id).await.or_not_found()
}

// TODO: cache it
async fn members<B: Body>(req: Request<B>) -> Result<ChannelMembers, AppError> {
    let query: IdQuery = parse_query(req.uri())?;

    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    let channel = Channel::get_by_id(&mut *conn, &query.id).await.or_not_found()?;
    let current_user_id = authenticate(&req).await.ok().map(|session| session.user_id);
    if !channel.is_public && current_user_id.is_none() {
        return Err(AppError::NoPermission(
            "you are not logged in and this is a private channel".to_string(),
        ));
    }
    let mut members = Member::get_by_channel_cached(&mut *conn, channel.space_id, channel.id).await?;

    let heartbeat_map = get_heartbeat_map()
        .lock()
        .await
        .get(&query.id)
        .cloned()
        .unwrap_or_default();

    members.sort_unstable_by(|a, b| {
        if !a.channel.character_name.is_empty() && b.channel.character_name.is_empty() {
            std::cmp::Ordering::Less
        } else if a.channel.character_name.is_empty() && !b.channel.character_name.is_empty() {
            std::cmp::Ordering::Greater
        } else {
            let a_heartbeat = heartbeat_map.get(&a.user.id);
            let b_heartbeat = heartbeat_map.get(&b.user.id);
            match (a_heartbeat, b_heartbeat) {
                (Some(a_heartbeat), Some(b_heartbeat)) => a_heartbeat.cmp(b_heartbeat),
                (Some(_), None) => std::cmp::Ordering::Less,
                (None, Some(_)) => std::cmp::Ordering::Greater,
                (None, None) => a.channel.join_date.cmp(&b.channel.join_date),
            }
        }
    });
    let self_index: Option<usize> =
        current_user_id.and_then(|current_user_id| members.iter().position(|member| member.user.id == current_user_id));
    if !channel.is_public && self_index.is_none() {
        return Err(AppError::NoPermission("this is a private channel".to_string()));
    }

    Ok(ChannelMembers {
        members,
        // deprecated
        color_list: HashMap::new(),
        heartbeat_map,
        self_index,
    })
}

async fn query_with_related(req: Request<impl Body>) -> Result<ChannelWithRelated, AppError> {
    let query: IdQuery = parse_query(req.uri())?;
    let session = authenticate(&req).await.ok();

    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    let (mut channel, space) = Channel::get_with_space(&mut *conn, &query.id).await.or_not_found()?;
    let members = Member::get_by_channel_cached(&mut *conn, channel.space_id, channel.id).await?;
    let my_member: Option<&Member> =
        session.and_then(|session| members.iter().find(|member| member.user.id == session.user_id));

    let color_list = ChannelMember::get_color_list(&mut *conn, &channel.id).await?;
    let heartbeat_map = {
        let map = get_heartbeat_map().lock().await;
        match map.get(&query.id) {
            Some(map) => map.clone(),
            _ => HashMap::new(),
        }
    };

    let encoded_events = if channel.is_public || my_member.is_some() {
        Event::get_from_cache(&query.id, None, None).await
    } else {
        channel.topic = String::new();
        Vec::new()
    };

    let with_related = ChannelWithRelated {
        channel,
        space,
        members,
        color_list,
        heartbeat_map,
        encoded_events,
    };
    Ok(with_related)
}

async fn create(req: Request<impl Body>) -> Result<ChannelWithMember, AppError> {
    let session = authenticate(&req).await?;
    let CreateChannel {
        space_id,
        name,
        character_name,
        default_dice_type,
        is_public,
        _type,
    } = interface::parse_body(req).await?;

    let pool = db::get().await;
    let mut trans = pool.begin().await?;
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
    let channel_member =
        ChannelMember::add_user(&mut *trans, &session.user_id, &channel.id, &character_name, true).await?;
    trans.commit().await?;
    let joined = ChannelWithMember {
        channel,
        member: channel_member,
    };
    Event::space_updated(space_id);
    Ok(joined)
}

async fn edit(req: Request<impl Body>) -> Result<Channel, AppError> {
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
    } = interface::parse_body(req).await?;

    let pool = db::get().await;
    let mut trans = pool.begin().await?;

    let space_member = SpaceMember::get_by_channel(&mut *trans, &session.user_id, &channel_id)
        .await
        .or_no_permission()?;
    if !space_member.is_admin {
        return Err(AppError::NoPermission("user is not admin".to_string()));
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
    )
    .await?;
    let push_members = !(grant_masters.is_empty() && remove_masters.is_empty());
    for user_id in grant_masters {
        ChannelMember::set_master(&mut *trans, &user_id, &channel_id, true)
            .await
            .ok();
    }
    for user_id in remove_masters {
        ChannelMember::set_master(&mut *trans, &user_id, &channel_id, false)
            .await
            .ok();
    }
    trans.commit().await?;
    if push_members {
        let members = Member::get_by_channel(&pool, channel.space_id, channel_id).await?;
        Event::push_members(channel.space_id, channel_id, members);
    }
    Event::channel_edited(channel.clone());
    Event::space_updated(channel.space_id);
    Ok(channel)
}

async fn edit_masters(req: Request<impl Body>) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let GrantOrRemoveChannelMaster {
        channel_id,
        grant_or_revoke,
        user_id,
    } = interface::parse_body(req).await?;
    let pool = db::get().await;
    let channel = Channel::get_by_id(&pool, &channel_id).await.or_not_found()?;
    let mut trans = pool.begin().await?;

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
        match grant_or_revoke {
            GrantOrRevoke::Grant => true,
            GrantOrRevoke::Revoke => false,
        },
    )
    .await
    .ok();
    trans.commit().await?;
    let members = Member::get_by_channel(&pool, space_member.space_id, channel_id).await?;
    Event::push_members(channel.space_id, channel_id, members);
    Ok(true)
}

async fn add_member(req: Request<impl Body>) -> Result<ChannelWithMember, AppError> {
    let session = authenticate(&req).await?;
    let AddChannelMember {
        channel_id,
        user_id,
        character_name,
    } = parse_body(req).await?;
    let pool = db::get().await;
    let mut trans = pool.begin().await?;

    let channel = Channel::get_by_id(&mut *trans, &channel_id).await.or_not_found()?;

    ChannelMember::get_cached(&mut *trans, session.user_id, channel.space_id, channel_id)
        .await
        .or_no_permission()?;
    SpaceMember::get(&mut *trans, &session.user_id, &channel.space_id)
        .await
        .or_no_permission()?;
    let member = ChannelMember::add_user(&mut *trans, &user_id, &channel_id, &character_name, false).await?;
    trans.commit().await?;
    let members = Member::get_by_channel(&pool, channel.space_id, channel_id).await?;
    Event::push_members(channel.space_id, channel_id, members);
    Ok(ChannelWithMember { channel, member })
}

async fn edit_member(req: Request<impl Body>) -> Result<ChannelMember, AppError> {
    let session = authenticate(&req).await?;
    let EditChannelMember {
        channel_id,
        character_name,
        text_color,
    } = interface::parse_body(req).await?;
    let channel = Channel::get_by_id(&db::get().await, &channel_id).await.or_not_found()?;

    let pool = db::get().await;
    let mut trans = pool.begin().await?;

    ChannelMember::get_cached(&mut *trans, session.user_id, channel.space_id, channel_id)
        .await
        .or_no_permission()?;

    let character_name = character_name.as_deref();
    let text_color = text_color.as_deref();
    let channel_member = ChannelMember::edit(&mut *trans, session.user_id, channel_id, character_name, text_color)
        .await?
        .or_not_found();
    trans.commit().await?;
    let members = Member::get_by_channel(&pool, channel.space_id, channel_id).await?;
    Event::push_members(channel.space_id, channel_id, members);
    channel_member
}

async fn all_members(req: Request<impl Body>) -> Result<Vec<ChannelMemberWithUser>, AppError> {
    let IdQuery { id } = parse_query(req.uri())?;

    ChannelMember::get_by_channel(&db::get().await, &id, true)
        .await
        .map_err(Into::into)
}

async fn join(req: Request<impl Body>) -> Result<ChannelWithMember, AppError> {
    let session = authenticate(&req).await?;
    let JoinChannel {
        channel_id,
        character_name,
    } = parse_body(req).await?;
    let pool = db::get().await;
    let mut trans = pool.begin().await?;

    let channel = Channel::get_by_id(&mut *trans, &channel_id).await.or_not_found()?;
    if !channel.is_public {
        return Err(AppError::NoPermission("private channel".to_string()));
    }
    SpaceMember::get(&mut *trans, &session.user_id, &channel.space_id)
        .await
        .or_no_permission()?;
    let member = ChannelMember::add_user(&mut *trans, &session.user_id, &channel.id, &character_name, false).await?;
    trans.commit().await?;
    let members = Member::get_by_channel(&pool, channel.space_id, channel_id).await?;
    Event::push_members(channel.space_id, channel_id, members);
    Ok(ChannelWithMember { channel, member })
}

async fn leave(req: Request<impl Body>) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;
    let pool = db::get().await;
    let channel = Channel::get_by_id(&pool, &id).await.or_not_found()?;
    ChannelMember::remove_user(&pool, &session.user_id, &id).await?;
    let members = Member::get_by_channel(&pool, channel.space_id, id).await?;
    Event::push_members(channel.space_id, id, members);
    Ok(true)
}

async fn kick(req: Request<impl Body>) -> Result<ChannelMembers, AppError> {
    let session = authenticate(&req).await?;
    let KickFromChannel {
        space_id,
        channel_id,
        user_id: user_to_be_kicked,
    } = parse_query(req.uri())?;
    let operator_user_id = session.user_id;
    let pool = db::get().await;
    let mut trans = pool.begin().await?;
    let space_member = SpaceMember::get(&mut *trans, &operator_user_id, &space_id)
        .await
        .or_no_permission()?;
    if !space_member.is_admin {
        let channel_member = ChannelMember::get_cached(&mut *trans, operator_user_id, space_id, channel_id)
            .await
            .or_no_permission()?;
        if !channel_member.is_master {
            return Err(AppError::NoPermission(
                "You have no permission to kick user from this channel.".to_string(),
            ));
        }
    }
    ChannelMember::remove_user(&mut *trans, &user_to_be_kicked, &channel_id).await?;
    trans.commit().await?;
    let mut conn = pool.acquire().await?;
    let members = Member::get_by_channel(&mut *conn, space_id, channel_id).await?;
    Event::push_members(space_id, channel_id, members.clone());
    let self_index: Option<usize> = members.iter().position(|member| member.user.id == operator_user_id);
    let heartbeat_map = get_heartbeat_map()
        .lock()
        .await
        .get(&channel_id)
        .cloned()
        .unwrap_or_default();
    Ok(ChannelMembers {
        members,
        color_list: HashMap::new(),
        heartbeat_map,
        self_index,
    })
}

async fn delete(req: Request<impl Body>) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;

    let pool = db::get().await;
    let mut conn = pool.acquire().await?;

    let channel = Channel::get_by_id(&mut *conn, &id).await.or_not_found()?;

    admin_only(&mut *conn, &session.user_id, &channel.space_id).await?;

    Channel::delete(&mut *conn, &id).await?;
    log::info!("channel {} was deleted.", &id);
    Event::channel_deleted(channel.space_id, id);
    Event::space_updated(channel.space_id);
    Ok(true)
}

async fn by_space(req: Request<impl Body>) -> Result<Vec<ChannelWithMaybeMember>, AppError> {
    let IdQuery { id: space_id } = parse_query(req.uri())?;
    let session = authenticate(&req).await.ok();
    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    let channels = if let Some(Session { user_id, .. }) = session {
        Channel::get_by_space_and_user(&mut *conn, &space_id, &user_id)
            .await
            .map_err(Into::<AppError>::into)?
            .into_iter()
            .collect()
    } else {
        Channel::get_by_space(&mut *conn, &space_id)
            .await
            .map_err(Into::<AppError>::into)?
            .into_iter()
            .filter(|channel| channel.is_public)
            .map(|channel| ChannelWithMaybeMember { channel, member: None })
            .collect()
    };
    Ok(channels)
}

async fn export(req: Request<impl Body>) -> Result<Vec<Message>, AppError> {
    let Export { channel_id, after } = parse_query(req.uri())?;
    let session = authenticate(&req).await?;
    let pool = db::get().await;
    let mut trans = pool.begin().await?;

    let channel = Channel::get_by_id(&mut *trans, &channel_id).await?.or_not_found()?;

    let space_member = SpaceMember::get(&mut *trans, &session.user_id, &channel.space_id)
        .await
        .or_no_permission()?;
    let channel_member = ChannelMember::get_cached(&mut *trans, session.user_id, channel.space_id, channel_id).await?;
    if channel_member.is_none() && !space_member.is_admin {
        return Err(AppError::NoPermission("user is not channel member".to_string()));
    }
    let hide = channel_member.map_or(true, |member| !member.is_master);
    Message::export(&mut *trans, &channel.id, hide, after)
        .await
        .map_err(Into::into)
}

pub async fn check_channel_name_exists(req: Request<impl Body>) -> Result<bool, AppError> {
    let CheckChannelName { space_id, name } = parse_query(req.uri())?;
    let channel = Channel::get_by_name(&db::get().await, space_id, &name).await?;
    Ok(channel.is_some())
}
pub async fn router(req: Request<impl Body>, path: &str) -> Result<hyper::Response<Vec<u8>>, AppError> {
    use hyper::Method;

    match (path, req.method().clone()) {
        ("/query", Method::GET) => query(req).await.map(ok_response),
        ("/query_with_related", Method::GET) => query_with_related(req).await.map(ok_response),
        ("/members", Method::GET) => members(req).await.map(ok_response),
        ("/by_space", Method::GET) => by_space(req).await.map(ok_response),
        ("/create", Method::POST) => create(req).await.map(ok_response),
        ("/edit", Method::POST) => edit(req).await.map(ok_response),
        ("/edit_master", Method::POST) => edit_masters(req).await.map(ok_response),
        ("/add_member", Method::POST) => add_member(req).await.map(ok_response),
        ("/edit_member", Method::POST) => edit_member(req).await.map(ok_response),
        ("/all_members", Method::GET) => all_members(req).await.map(ok_response),
        ("/join", Method::POST) => join(req).await.map(ok_response),
        ("/leave", Method::POST) => leave(req).await.map(ok_response),
        ("/kick", Method::POST) => kick(req).await.map(ok_response),
        ("/delete", Method::POST) => delete(req).await.map(ok_response),
        ("/check_name", Method::GET) => check_channel_name_exists(req).await.map(ok_response),
        ("/export", Method::GET) => export(req).await.map(ok_response),
        _ => missing(),
    }
}
