use super::api::{ChannelMembers, ChannelWithMaybeMember, CreateChannel, EditChannel, GrantOrRemoveChannelMaster};
use super::models::ChannelMember;
use super::Channel;
use crate::channels::api::{
    AddChannelMember, ChannelMemberWithUser, ChannelWithMember, ChannelWithRelated, CheckChannelName,
    EditChannelMember, Export, GrantOrRevoke, JoinChannel, KickFromChannel,
};
use crate::channels::models::Member;
use crate::csrf::authenticate;
use crate::database;
use crate::database::Querist;
use crate::error::{AppError, Find};
use crate::events::context::get_heartbeat_map;
use crate::events::Event;
use crate::interface::{self, missing, ok_response, parse_body, parse_query, IdQuery, Response};
use crate::messages::Message;
use crate::session::Session;
use crate::spaces::{Space, SpaceMember};
use hyper::{Body, Request};
use std::collections::HashMap;
use uuid::Uuid;

async fn admin_only<T: Querist>(db: &mut T, user_id: &Uuid, space_id: &Uuid) -> Result<(), AppError> {
    let member = SpaceMember::get(db, user_id, space_id).await.or_no_permission()?;
    if member.is_admin {
        Ok(())
    } else {
        Err(AppError::NoPermission("You're not admin".to_string()))
    }
}

async fn query(req: Request<Body>) -> Result<Channel, AppError> {
    let query: IdQuery = parse_query(req.uri())?;

    let mut db = database::get().await?;
    Channel::get_by_id(&mut *db, &query.id).await.or_not_found()
}

async fn members(req: Request<Body>) -> Result<ChannelMembers, AppError> {
    let query: IdQuery = parse_query(req.uri())?;

    let mut conn = database::get().await?;
    let db = &mut *conn;
    let channel = Channel::get_by_id(db, &query.id).await.or_not_found()?;
    let members = Member::get_by_channel(db, channel.id).await?;

    let color_list = ChannelMember::get_color_list(db, &channel.id).await?;

    let heartbeat_map = get_heartbeat_map()
        .lock()
        .await
        .get(&query.id)
        .cloned()
        .unwrap_or_default();
    Ok(ChannelMembers {
        members,
        color_list,
        heartbeat_map,
    })
}

async fn query_with_related(req: Request<Body>) -> Result<ChannelWithRelated, AppError> {
    let query: IdQuery = parse_query(req.uri())?;
    let session = authenticate(&req).await.ok();

    let mut conn = database::get().await?;
    let db = &mut *conn;
    let (mut channel, space) = Channel::get_with_space(db, &query.id).await.or_not_found()?;
    let members = Member::get_by_channel(db, channel.id).await?;
    let my_member: Option<&Member> =
        session.and_then(|session| members.iter().find(|member| member.user.id == session.user_id));

    let color_list = ChannelMember::get_color_list(db, &channel.id).await?;
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

async fn create(req: Request<Body>) -> Result<ChannelWithMember, AppError> {
    let session = authenticate(&req).await?;
    let CreateChannel {
        space_id,
        name,
        character_name,
        default_dice_type,
        is_public,
    } = interface::parse_body(req).await?;

    let mut conn = database::get().await?;
    let mut trans = conn.transaction().await?;
    let db = &mut trans;
    Space::get_by_id(db, &space_id)
        .await?
        .ok_or_else(|| AppError::BadRequest("The space not found".to_string()))?;
    admin_only(db, &session.user_id, &space_id).await?;

    let channel = Channel::create(db, &space_id, &name, is_public, default_dice_type.as_deref()).await?;
    let channel_member = ChannelMember::add_user(db, &session.user_id, &channel.id, &character_name, true).await?;
    trans.commit().await?;
    let joined = ChannelWithMember {
        channel,
        member: channel_member,
    };
    Event::space_updated(space_id);
    Ok(joined)
}

async fn edit(req: Request<Body>) -> Result<Channel, AppError> {
    let session = authenticate(&req).await?;
    let EditChannel {
        channel_id,
        name,
        topic,
        default_dice_type,
        default_roll_command,
        grant_masters,
        remove_masters,
        is_public,
        is_document,
    } = interface::parse_body(req).await?;

    let mut conn = database::get().await?;
    let mut trans = conn.transaction().await?;
    let db = &mut trans;

    let space_member = SpaceMember::get_by_channel(db, &session.user_id, &channel_id)
        .await
        .or_no_permission()?;
    if !space_member.is_admin {
        return Err(AppError::NoPermission("user is not admin".to_string()));
    }
    let channel = Channel::edit(
        db,
        &channel_id,
        name.as_deref(),
        topic.as_deref(),
        default_dice_type.as_deref(),
        default_roll_command.as_deref(),
        is_public,
        is_document,
    )
    .await?;
    let push_members = !(grant_masters.is_empty() && remove_masters.is_empty());
    for user_id in grant_masters {
        ChannelMember::set_master(db, &user_id, &channel_id, true).await.ok();
    }
    for user_id in remove_masters {
        ChannelMember::set_master(db, &user_id, &channel_id, false).await.ok();
    }
    trans.commit().await?;
    if push_members {
        Event::push_members(channel_id);
    }
    Event::channel_edited(channel.clone());
    Event::space_updated(channel.space_id);
    Ok(channel)
}

async fn edit_masters(req: Request<Body>) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let GrantOrRemoveChannelMaster {
        channel_id,
        grant_or_revoke,
        user_id,
    } = interface::parse_body(req).await?;
    let mut conn = database::get().await?;
    let mut trans = conn.transaction().await?;
    let db = &mut trans;

    let space_member = SpaceMember::get_by_channel(db, &session.user_id, &channel_id)
        .await
        .or_no_permission()?;
    if !space_member.is_admin {
        return Err(AppError::NoPermission("user is not admin".to_string()));
    }

    ChannelMember::set_master(
        db,
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
    Event::push_members(channel_id);
    Ok(true)
}

async fn add_member(req: Request<Body>) -> Result<ChannelWithMember, AppError> {
    let session = authenticate(&req).await?;
    let AddChannelMember {
        channel_id,
        user_id,
        character_name,
    } = parse_body(req).await?;
    let mut conn = database::get().await?;
    let mut trans = conn.transaction().await?;
    let db = &mut trans;

    ChannelMember::get(db, &session.user_id, &channel_id)
        .await
        .or_no_permission()?;

    let channel = Channel::get_by_id(db, &channel_id).await.or_not_found()?;
    SpaceMember::get(db, &session.user_id, &channel.space_id)
        .await
        .or_no_permission()?;
    let member = ChannelMember::add_user(db, &user_id, &channel_id, &character_name, false).await?;
    trans.commit().await?;
    Event::push_members(channel_id);
    Ok(ChannelWithMember { channel, member })
}

async fn edit_member(req: Request<Body>) -> Result<ChannelMember, AppError> {
    let session = authenticate(&req).await?;
    let EditChannelMember {
        channel_id,
        character_name,
        text_color,
    } = interface::parse_body(req).await?;

    let mut conn = database::get().await?;
    let mut trans = conn.transaction().await?;
    let db = &mut trans;

    ChannelMember::get(db, &session.user_id, &channel_id)
        .await
        .or_no_permission()?;

    let character_name = character_name.as_deref();
    let text_color = text_color.as_deref();
    let channel_member = ChannelMember::edit(db, session.user_id, channel_id, character_name, text_color)
        .await?
        .or_not_found();
    trans.commit().await?;
    Event::push_members(channel_id);
    channel_member
}

async fn all_members(req: Request<Body>) -> Result<Vec<ChannelMemberWithUser>, AppError> {
    let IdQuery { id } = parse_query(req.uri())?;
    let mut db = database::get().await?;
    let db = &mut *db;

    ChannelMember::get_by_channel(db, &id, true).await.map_err(Into::into)
}

async fn join(req: Request<Body>) -> Result<ChannelWithMember, AppError> {
    let session = authenticate(&req).await?;
    let JoinChannel {
        channel_id,
        character_name,
    } = parse_body(req).await?;
    let mut conn = database::get().await?;
    let mut trans = conn.transaction().await?;
    let db = &mut trans;

    let channel = Channel::get_by_id(db, &channel_id).await.or_not_found()?;
    if !channel.is_public {
        return Err(AppError::NoPermission("private channel".to_string()));
    }
    SpaceMember::get(db, &session.user_id, &channel.space_id)
        .await
        .or_no_permission()?;
    let member = ChannelMember::add_user(db, &session.user_id, &channel.id, &character_name, false).await?;
    trans.commit().await?;
    Event::push_members(channel_id);
    Ok(ChannelWithMember { channel, member })
}

async fn leave(req: Request<Body>) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;
    let mut db = database::get().await?;
    ChannelMember::remove_user(&mut *db, &session.user_id, &id).await?;
    Event::push_members(id);
    Ok(true)
}

async fn kick(req: Request<Body>) -> Result<ChannelMembers, AppError> {
    let session = authenticate(&req).await?;
    let KickFromChannel {
        space_id,
        channel_id,
        user_id: user_to_be_kicked,
    } = parse_query(req.uri())?;
    let operator_user_id = session.user_id;
    let mut db = database::get().await?;
    let mut trans = db.transaction().await?;
    let space_member = SpaceMember::get(&mut trans, &operator_user_id, &space_id)
        .await
        .or_no_permission()?;
    if !space_member.is_admin {
        let channel_member = ChannelMember::get(&mut trans, &operator_user_id, &channel_id)
            .await
            .or_no_permission()?;
        if !channel_member.is_master {
            return Err(AppError::NoPermission(
                "You have no permission to kick user from this channel.".to_string(),
            ));
        }
    }
    ChannelMember::remove_user(&mut trans, &user_to_be_kicked, &channel_id).await?;
    trans.commit().await?;
    Event::push_members(channel_id);
    let db = &mut *db;
    let members = Member::get_by_channel(db, channel_id).await?;
    let color_list = ChannelMember::get_color_list(db, &channel_id).await?;
    let heartbeat_map = get_heartbeat_map()
        .lock()
        .await
        .get(&channel_id)
        .cloned()
        .unwrap_or_default();
    Ok(ChannelMembers {
        members,
        color_list,
        heartbeat_map,
    })
}

async fn delete(req: Request<Body>) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let IdQuery { id } = parse_query(req.uri())?;

    let mut conn = database::get().await?;
    let db = &mut *conn;

    let channel = Channel::get_by_id(db, &id).await.or_not_found()?;

    admin_only(db, &session.user_id, &channel.space_id).await?;

    Channel::delete(db, &id).await?;
    log::info!("channel {} was deleted.", &id);
    Event::channel_deleted(channel.space_id, id);
    Event::space_updated(channel.space_id);
    Ok(true)
}

async fn by_space(req: Request<Body>) -> Result<Vec<ChannelWithMaybeMember>, AppError> {
    let IdQuery { id: space_id } = parse_query(req.uri())?;
    let mut conn = database::get().await?;
    let session = authenticate(&req).await.ok();
    let db = &mut *conn;
    let channels = if let Some(Session { user_id, .. }) = session {
        Channel::get_by_space_and_user(db, &space_id, &user_id)
            .await
            .map_err(Into::<AppError>::into)?
            .into_iter()
            .collect()
    } else {
        Channel::get_by_space(db, &space_id)
            .await
            .map_err(Into::<AppError>::into)?
            .into_iter()
            .filter(|channel| channel.is_public)
            .map(|channel| ChannelWithMaybeMember { channel, member: None })
            .collect()
    };
    Ok(channels)
}

async fn export(req: Request<Body>) -> Result<Vec<Message>, AppError> {
    let Export { channel_id, after } = parse_query(req.uri())?;
    let session = authenticate(&req).await?;
    let mut conn = database::get().await?;
    let mut trans = conn.transaction().await?;
    let db = &mut trans;

    let channel = Channel::get_by_id(db, &channel_id).await?.or_not_found()?;

    let space_member = SpaceMember::get(db, &session.user_id, &channel.space_id)
        .await
        .or_no_permission()?;
    let channel_member = ChannelMember::get(db, &session.user_id, &channel_id).await?;
    if channel_member.is_none() && !space_member.is_admin {
        return Err(AppError::NoPermission("user is not channel member".to_string()));
    }
    let hide = channel_member.map_or(true, |member| !member.is_master);
    Message::export(db, &channel.id, hide, after).await.map_err(Into::into)
}

async fn my_channels(req: Request<Body>) -> Result<Vec<ChannelWithMember>, AppError> {
    let session = authenticate(&req).await?;

    let mut conn = database::get().await?;
    let db = &mut *conn;
    Channel::get_by_user(db, session.user_id).await.map_err(Into::into)
}

pub async fn check_channel_name_exists(req: Request<Body>) -> Result<bool, AppError> {
    let CheckChannelName { space_id, name } = parse_query(req.uri())?;
    let mut db = database::get().await?;
    let channel = Channel::get_by_name(&mut *db, space_id, &name).await?;
    Ok(channel.is_some())
}
pub async fn router(req: Request<Body>, path: &str) -> Result<Response, AppError> {
    use hyper::Method;

    match (path, req.method().clone()) {
        ("/query", Method::GET) => query(req).await.map(ok_response),
        ("/query_with_related", Method::GET) => query_with_related(req).await.map(ok_response),
        ("/members", Method::GET) => members(req).await.map(ok_response),
        ("/by_space", Method::GET) => by_space(req).await.map(ok_response),
        ("/my", Method::GET) => my_channels(req).await.map(ok_response),
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
