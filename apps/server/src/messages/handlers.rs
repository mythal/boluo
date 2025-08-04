use super::Message;
use super::api::{EditMessage, NewMessage};
use crate::channels::{Channel, ChannelMember};
use crate::csrf::authenticate;
use crate::error::{AppError, Find};
use crate::events::Update;
use crate::interface::{Response, missing, ok_response, parse_query, response};
use crate::messages::api::{GetMessagesByChannel, MoveMessageBetween};
use crate::spaces::SpaceMember;
use crate::{db, interface};
use hyper::Request;
use hyper::body::Body;

async fn send(req: Request<impl Body>) -> Result<Message, AppError> {
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
    .await
    .inspect_err(|_| {
        metrics::counter!("boluo_server_messages_created_failed_total").increment(1);
    })?;
    Update::new_message(space_member.space_id, message.clone(), preview_id);

    metrics::counter!("boluo_server_messages_created_total").increment(1);
    metrics::histogram!("boluo_server_messages_create_duration_ms")
        .record(start_time.elapsed().as_millis() as f64);
    Ok(message)
}

async fn edit(req: Request<impl Body>) -> Result<Message, AppError> {
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

async fn move_between(req: Request<impl Body>) -> Result<bool, AppError> {
    let session = authenticate(&req).await?;
    let MoveMessageBetween {
        message_id,
        channel_id,
        range,
        expect_pos,
    } = interface::parse_body(req).await?;

    let pool = db::get().await;
    let mut conn = pool.acquire().await?;
    let message = Message::get(&mut *conn, &message_id, Some(&session.user_id))
        .await
        .or_not_found()?;
    crate::pos::CHANNEL_POS_MANAGER
        .submitted(
            channel_id,
            message_id,
            message.pos_p,
            message.pos_q,
            Some(message_id),
        )
        .await;
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
        &mut *conn,
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
            Message::move_bottom(&mut *conn, &channel_id, &message_id, a)
                .await?
                .or_not_found()?
        }
        (Some((_, 0) | (0, 1)) | None, Some(b)) => {
            Message::move_above(&mut *conn, &channel_id, &message_id, b)
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
    metrics::counter!("boluo_server_messages_deleted_total").increment(1);
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
    metrics::counter!("boluo_server_messages_folded_total").increment(1);
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
        ("/query", Method::GET) => response(query(req).await).await,
        ("/by_channel", Method::GET) => response(by_channel(req).await).await,
        ("/send", Method::POST) => response(send(req).await).await,
        ("/edit", Method::POST) => response(edit(req).await).await,
        ("/edit", Method::PUT) => response(edit(req).await).await,
        ("/edit", Method::PATCH) => response(edit(req).await).await,
        ("/move_between", Method::POST) => move_between(req).await.map(ok_response),
        ("/toggle_fold", Method::POST) => response(toggle_fold(req).await).await,
        ("/delete", Method::POST) => response(delete(req).await).await,
        _ => missing(),
    }
}
