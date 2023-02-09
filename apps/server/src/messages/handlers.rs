use super::api::{EditMessage, NewMessage};
use super::Message;
use crate::channels::{Channel, ChannelMember};
use crate::csrf::authenticate;
use crate::error::{AppError, Find};
use crate::events::Event;
use crate::interface::{missing, ok_response, parse_query, Response};
use crate::messages::api::{GetMessagesByChannel, MoveMessageBetween};
use crate::spaces::SpaceMember;
use crate::{database, interface};
use hyper::{Body, Request};

async fn send(req: Request<Body>) -> Result<Message, AppError> {
    let session = authenticate(&req).await?;
    let NewMessage {
        message_id,
        channel_id,
        name,
        text,
        entities,
        in_game,
        is_action,
        media_id,
        whisper_to_users,
        pos: request_pos,
    } = interface::parse_body(req).await?;
    let mut conn = database::get().await?;
    let db = &mut *conn;
    let (channel_member, space_member) = ChannelMember::get_with_space_member(db, &session.user_id, &channel_id)
        .await
        .or_no_permission()?;
    let mut cache = crate::cache::conn().await;
    let message = Message::create(
        db,
        &mut cache,
        message_id.as_ref(),
        &channel_id,
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
    )
    .await?;
    Event::new_message(space_member.space_id, message.clone());
    Ok(message)
}

async fn edit(req: Request<Body>) -> Result<Message, AppError> {
    let session = authenticate(&req).await?;
    let EditMessage {
        message_id,
        name,
        text,
        entities,
        in_game,
        is_action,
        media_id,
    } = interface::parse_body(req).await?;
    let mut db = database::get().await?;
    let mut trans = db.transaction().await?;
    let db = &mut trans;
    let mut message = Message::get(db, &message_id, Some(&session.user_id))
        .await?
        .or_not_found()?;
    let channel = Channel::get_by_id(db, &message.channel_id).await.or_not_found()?;
    let (_, space_member) = ChannelMember::get_with_space_member(db, &session.user_id, &message.channel_id)
        .await
        .or_no_permission()?;
    if !channel.is_document && message.sender_id != session.user_id {
        return Err(AppError::NoPermission("user id dismatch".to_string()));
    }
    if name.is_some() || text.is_some() || entities.is_some() || in_game.is_some() || is_action.is_some() {
        let text = text.as_deref();
        let name = name.as_deref();
        message = Message::edit(
            db,
            name,
            &message_id,
            text,
            entities,
            in_game,
            is_action,
            None,
            media_id,
        )
        .await?
        .ok_or_else(|| unexpected!("The message had been delete."))?;
    }
    trans.commit().await?;
    Event::message_edited(space_member.space_id, message.clone());
    Ok(message)
}

async fn move_between(req: Request<Body>) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let MoveMessageBetween {
        message_id,
        channel_id,
        range,
    } = interface::parse_body(req).await?;

    let mut db = database::get().await?;
    let mut trans = db.transaction().await?;
    let db = &mut trans;
    let message = Message::get(db, &message_id, Some(&session.user_id))
        .await
        .or_not_found()?;
    let channel = Channel::get_by_id(db, &message.channel_id).await.or_not_found()?;
    let channel_member = ChannelMember::get(db, &session.user_id, &message.channel_id)
        .await
        .or_no_permission()?;
    if !channel.is_document && !channel_member.is_master && message.sender_id != session.user_id {
        return Err(AppError::NoPermission(
            "Only the master can move other's messages.".to_string(),
        ));
    }

    let mut message = match range {
        (None, None) => return Err(AppError::BadRequest("a and b cannot both be null".to_string())),
        (Some(a), Some(b)) => {
            if a < b {
                Message::move_between(db, &message_id, &a, &b).await?.or_not_found()?
            } else {
                Message::move_between(db, &message_id, &b, &a).await?.or_not_found()?
            }
        }
        (None, Some(b)) => Message::move_above(db, &channel_id, &message_id, &b)
            .await?
            .or_not_found()?,
        (Some(a), None) => Message::move_bottom(db, &channel_id, &message_id, &a)
            .await?
            .or_not_found()?,
    };

    trans.commit().await?;
    if message.whisper_to_users.is_some() {
        message.hide();
    }
    Event::message_edited(channel.space_id, message);
    Ok(true)
}

async fn query(req: Request<Body>) -> Result<Message, AppError> {
    let interface::IdQuery { id } = interface::parse_query(req.uri())?;
    let mut conn = database::get().await?;
    let db = &mut *conn;
    let user_id = authenticate(&req).await.ok().map(|session| session.user_id);
    Message::get(db, &id, user_id.as_ref()).await.or_not_found()
}

async fn delete(req: Request<Body>) -> Result<Message, AppError> {
    let session = authenticate(&req).await?;
    let interface::IdQuery { id } = interface::parse_query(req.uri())?;
    let mut conn = database::get().await?;
    let db = &mut *conn;
    let message = Message::get(db, &id, Some(&session.user_id)).await.or_not_found()?;
    let space_member = SpaceMember::get_by_channel(db, &session.user_id, &message.channel_id)
        .await
        .or_no_permission()?;
    if !space_member.is_admin && message.sender_id != session.user_id {
        return Err(AppError::NoPermission("user id mismatch".to_string()));
    }
    Message::delete(db, &id).await?;
    Event::message_deleted(space_member.space_id, message.channel_id, message.id);
    Ok(message)
}

async fn toggle_fold(req: Request<Body>) -> Result<Message, AppError> {
    let session = authenticate(&req).await?;
    let interface::IdQuery { id } = interface::parse_query(req.uri())?;
    let mut conn = database::get().await?;
    let db = &mut *conn;
    let message = Message::get(db, &id, Some(&session.user_id)).await.or_not_found()?;
    let channel = Channel::get_by_id(db, &message.channel_id).await.or_not_found()?;
    let channel_member = ChannelMember::get(db, &session.user_id, &message.channel_id)
        .await
        .or_no_permission()?;
    if !channel.is_document && message.sender_id != session.user_id && !channel_member.is_master {
        return Err(AppError::NoPermission("user id dismatch".to_string()));
    }
    let folded = Some(!message.folded);
    let message = Message::edit(db, None, &message.id, None, None, None, None, folded, None)
        .await?
        .ok_or_else(|| unexpected!("message not found"))?;
    Event::message_edited(channel.space_id, message.clone());
    Ok(message)
}

async fn by_channel(req: Request<Body>) -> Result<Vec<Message>, AppError> {
    let GetMessagesByChannel {
        channel_id,
        limit,
        before,
    } = parse_query(req.uri())?;

    let mut db = database::get().await?;
    let db = &mut *db;

    let channel = Channel::get_by_id(db, &channel_id).await.or_not_found()?;
    if !channel.is_public {
        let session = authenticate(&req).await?;
        ChannelMember::get(db, &session.user_id, &channel_id)
            .await
            .or_no_permission()?;
    }
    let limit = limit.unwrap_or(128);
    Message::get_by_channel(db, &channel_id, before, limit)
        .await
        .map_err(Into::into)
}

pub async fn router(req: Request<Body>, path: &str) -> Result<Response, AppError> {
    use hyper::Method;

    match (path, req.method().clone()) {
        ("/query", Method::GET) => query(req).await.map(ok_response),
        ("/by_channel", Method::GET) => by_channel(req).await.map(ok_response),
        ("/send", Method::POST) => send(req).await.map(ok_response),
        ("/edit", Method::PATCH) => edit(req).await.map(ok_response),
        ("/move_between", Method::POST) => move_between(req).await.map(ok_response),
        ("/toggle_fold", Method::POST) => toggle_fold(req).await.map(ok_response),
        ("/delete", Method::POST) => delete(req).await.map(ok_response),
        _ => missing(),
    }
}
