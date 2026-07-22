use crate::channels::Channel;
use crate::error::AppError;
use crate::error::Find;
use crate::events::Update;
use crate::messages::Entities;
use crate::spaces::SpaceMember;
use chrono::prelude::*;
use uuid::Uuid;

pub use shared_types::preview::{Preview, PreviewDiff, PreviewDiffPost, PreviewEdit, PreviewPost};

pub async fn broadcast_preview_diff(
    post: PreviewDiffPost,
    space_id: Uuid,
    user_id: Uuid,
) -> Result<(), AppError> {
    Update::preview_diff(
        space_id,
        PreviewDiff {
            sender: user_id,
            payload: post,
        },
    )
    .await;
    Ok(())
}

fn is_cleared_preview_content(text: &Option<String>, entities: &Entities) -> bool {
    text.as_ref()
        .is_some_and(|text| text.trim().is_empty() || entities.0.is_empty())
}

fn should_cancel_preview_position(
    text: &Option<String>,
    entities: &Entities,
    edit_for: &Option<DateTime<Utc>>,
    edit: &Option<PreviewEdit>,
) -> bool {
    is_cleared_preview_content(text, entities) && edit_for.is_none() && edit.is_none()
}

pub async fn broadcast_preview_post(
    post: PreviewPost,
    ctx: &crate::context::AppContext,
    space_id: Uuid,
    user_id: Uuid,
) -> Result<(), AppError> {
    if let Some(PreviewEdit { q, .. }) = post.edit {
        if q == 0 {
            return Err(AppError::BadRequest("edit.q must not be zero".to_string()));
        }
    }
    let PreviewPost {
        id,
        version,
        channel_id,
        name,
        media_id,
        in_game,
        is_action,
        text,
        entities,
        mut edit_for,
        clear,
        edit,
    } = post;
    let should_cancel_position = should_cancel_preview_position(&text, &entities, &edit_for, &edit);
    let muted = text.is_none();
    let mut pos = 0.0;
    if let Some(PreviewEdit { p, q, time }) = edit.as_ref() {
        pos = *p as f64 / *q as f64;
        edit_for = Some(*time);
    } else if edit_for.is_none() && !should_cancel_position {
        use std::time::Duration;

        let timeout = if muted {
            Duration::from_secs(8)
        } else {
            Duration::from_secs(60 * 3)
        };
        let pos_ratio = crate::messages::MESSAGE_POSITIONS
            .preview_pos(&ctx.db, channel_id, id, timeout)
            .await?;
        pos = (*pos_ratio.numer() as f64 / *pos_ratio.denom() as f64).ceil();
    }
    let is_master = if let Some(member) = ctx
        .space_store
        .resolve_channel_member(space_id, channel_id, user_id)
        .await?
    {
        member.channel.is_master
    } else {
        // resolve_channel_member already performed the bounded authoritative wait.
        let snapshot = ctx.space_store.loaded_authoritative_snapshot(space_id);
        let (channel, is_space_member) = if let Some(snapshot) = snapshot {
            let channel = snapshot.channels.get(&channel_id).cloned().or_not_found()?;
            let is_space_member = snapshot.space_members.contains_key(&user_id);
            (channel, is_space_member)
        } else {
            let mut conn = ctx.db.acquire().await?;
            let channel = Channel::get_by_id(&mut *conn, &channel_id)
                .await
                .or_not_found()?;
            let is_space_member = SpaceMember::get(&mut *conn, &user_id, &channel.space_id).await?;
            (channel, is_space_member.is_some())
        };
        if channel.space_id != space_id {
            return Err(AppError::NoPermission(
                "Channel does not belong to this space".to_string(),
            ));
        }
        if !channel.is_public {
            return Err(AppError::NoPermission(
                "You are not a member of this channel".to_string(),
            ));
        }
        if !is_space_member {
            return Err(AppError::NoPermission(
                "You are not a member of this space".to_string(),
            ));
        }
        tracing::warn!(
            "User {} is posting preview to public channel {} without being a member",
            user_id,
            channel_id
        );
        false
    };
    let whisper_to_users = None;
    let preview = Box::new(Preview {
        id,
        version,
        sender_id: user_id,
        channel_id,
        parent_message_id: None,
        name,
        media_id,
        in_game,
        is_action,
        text,
        whisper_to_users,
        entities,
        is_master,
        edit_for,
        clear,
        pos,
        edit,
    });

    if should_cancel_position {
        crate::messages::MESSAGE_POSITIONS.cancel(channel_id, id);
    }
    Update::message_preview(space_id, preview).await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;
    use shared_types::entities::{Entity, Span};

    fn text_entities(len: i32) -> Entities {
        Entities(vec![Entity::Text(Span { start: 0, len })])
    }

    fn edit() -> PreviewEdit {
        PreviewEdit {
            time: Utc.timestamp_opt(1, 0).single().unwrap(),
            p: 42,
            q: 1,
        }
    }

    #[test]
    fn cleared_non_edit_preview_cancels_position() {
        assert!(should_cancel_preview_position(
            &Some("   ".to_string()),
            &text_entities(3),
            &None,
            &None,
        ));
        assert!(should_cancel_preview_position(
            &Some("hello".to_string()),
            &Entities(vec![]),
            &None,
            &None,
        ));
    }

    #[test]
    fn cleared_edit_preview_does_not_cancel_message_position() {
        assert!(!should_cancel_preview_position(
            &Some(String::new()),
            &Entities(vec![]),
            &None,
            &Some(edit()),
        ));
    }

    #[test]
    fn legacy_edit_for_preview_does_not_cancel_position() {
        assert!(!should_cancel_preview_position(
            &Some(String::new()),
            &Entities(vec![]),
            &Some(Utc.timestamp_opt(1, 0).single().unwrap()),
            &None,
        ));
    }
}
