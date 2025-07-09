use super::Message;
use super::api::{EditMessage, NewMessage};
use crate::channels::{Channel, ChannelMember};
use crate::csrf::authenticate;
use crate::error::{AppError, Find};
use crate::events::Update;
use crate::interface::{Response, missing, ok_response, parse_query};
use crate::messages::api::{GetMessagesByChannel, MoveMessageBetween};
use crate::spaces::SpaceMember;
use crate::{db, interface};
use hyper::Request;
use hyper::body::Body;

async fn send(req: Request<impl Body>) -> Result<Message, AppError> {
    let session = authenticate(&req).await?;
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
    } = interface::parse_body(req).await?;
    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    let channel = Channel::get_by_id(&mut *conn, &channel_id)
        .await
        .or_not_found()?;
    let (channel_member, space_member) = ChannelMember::get_with_space_member(
        &mut *conn,
        session.user_id,
        channel_id,
        &channel.space_id,
    )
    .await
    .or_no_permission()?;
    let message = Message::create(
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
    .await?;
    Update::new_message(space_member.space_id, message.clone(), preview_id);
    Ok(message)
}

async fn edit(req: Request<impl Body>) -> Result<Message, AppError> {
    let session = authenticate(&req).await?;
    let EditMessage {
        message_id,
        name,
        text,
        entities,
        in_game,
        is_action,
        media_id,
        color,
    } = interface::parse_body(req).await?;
    let pool = db::get().await;
    let mut trans = pool.begin().await?;
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
    Update::message_edited(
        space_member.space_id,
        edited_message.clone(),
        edited_message.pos,
    );
    Ok(edited_message)
}

async fn move_between(req: Request<impl Body>) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let MoveMessageBetween {
        message_id,
        channel_id,
        range,
    } = interface::parse_body(req).await?;

    let pool = db::get().await;
    let mut trans = pool.begin().await?;
    let message = Message::get(&mut *trans, &message_id, Some(&session.user_id))
        .await
        .or_not_found()?;
    let channel = Channel::get_by_id(&mut *trans, &message.channel_id)
        .await
        .or_not_found()?;
    let channel_member = ChannelMember::get(
        &mut *trans,
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
            Message::move_bottom(&mut *trans, &channel_id, &message_id, a)
                .await?
                .or_not_found()?
        }
        (Some((_, 0) | (0, 1)) | None, Some(b)) => {
            Message::move_above(&mut *trans, &channel_id, &message_id, b)
                .await?
                .or_not_found()?
        }
        (Some(a), Some(b)) => Message::move_between(&mut trans, &message_id, channel_id, a, b)
            .await?
            .or_not_found()?,
    };

    trans.commit().await?;
    crate::pos::CHANNEL_POS_MANAGER
        .submitted(
            channel_id,
            message_id,
            moved_message.pos_p,
            moved_message.pos_q,
            Some(message_id),
        )
        .await;
    if moved_message.whisper_to_users.is_some() {
        moved_message.hide(None);
    }
    Update::message_edited(channel.space_id, moved_message, message.pos);
    Ok(true)
}

async fn query(req: Request<impl Body>) -> Result<Message, AppError> {
    let interface::IdQuery { id } = interface::parse_query(req.uri())?;
    let user_id = authenticate(&req).await.ok().map(|session| session.user_id);
    Message::get(&db::get().await, &id, user_id.as_ref())
        .await
        .or_not_found()
}

async fn delete(req: Request<impl Body>) -> Result<Message, AppError> {
    let session = authenticate(&req).await?;
    let interface::IdQuery { id } = interface::parse_query(req.uri())?;
    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
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
    crate::pos::CHANNEL_POS_MANAGER
        .cancel(message.channel_id, message.id)
        .await;
    Ok(message)
}

async fn toggle_fold(req: Request<impl Body>) -> Result<Message, AppError> {
    let session = authenticate(&req).await?;
    let interface::IdQuery { id } = interface::parse_query(req.uri())?;
    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    let message = Message::get(&mut *conn, &id, Some(&session.user_id))
        .await
        .or_not_found()?;
    let channel = Channel::get_by_id(&mut *conn, &message.channel_id)
        .await
        .or_not_found()?;
    let channel_member = ChannelMember::get(
        &mut *conn,
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
    Ok(edited_message)
}

async fn by_channel(req: Request<impl Body>) -> Result<Vec<Message>, AppError> {
    let GetMessagesByChannel {
        channel_id,
        limit,
        before,
    } = parse_query(req.uri())?;

    let pool = db::get().await;
    let mut conn = pool.acquire().await?;

    let channel = Channel::get_by_id(&mut *conn, &channel_id)
        .await
        .or_not_found()?;
    let session = authenticate(&req).await;
    let current_user_id = session.as_ref().ok().map(|session| session.user_id);
    if !channel.is_public {
        ChannelMember::get(&mut *conn, session?.user_id, channel.space_id, channel_id)
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

pub async fn router(req: Request<impl Body>, path: &str) -> Result<Response, AppError> {
    use hyper::Method;

    match (path, req.method().clone()) {
        ("/query", Method::GET) => query(req).await.map(ok_response),
        ("/by_channel", Method::GET) => by_channel(req).await.map(ok_response),
        ("/send", Method::POST) => send(req).await.map(ok_response),
        ("/edit", Method::POST) => edit(req).await.map(ok_response),
        ("/edit", Method::PUT) => edit(req).await.map(ok_response),
        ("/edit", Method::PATCH) => edit(req).await.map(ok_response),
        ("/move_between", Method::POST) => move_between(req).await.map(ok_response),
        ("/toggle_fold", Method::POST) => toggle_fold(req).await.map(ok_response),
        ("/delete", Method::POST) => delete(req).await.map(ok_response),
        _ => missing(),
    }
}
