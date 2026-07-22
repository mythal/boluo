//! Mirrors Boluo compose previews into their Telegram topic: a preview is shown
//! as a Telegram message, edited as the author types, and deleted once they send
//! or stop. Nothing is persisted.

use std::collections::HashMap;

use anyhow::{Context, Result};
use frankenstein::AsyncTelegramApi;
use frankenstein::methods::{EditMessageTextParams, SendMessageParams};
use shared_types::preview::{Preview, PreviewDiff, PreviewDiffOp, PreviewDiffPost};
use tokio::sync::Mutex;
use tracing::debug;
use uuid::Uuid;

use super::{PREVIEW_PREFIX, TELEGRAM_TEXT_LIMIT, delete_message, truncate_to};
use crate::Bridge;
use crate::store::{Binding, TopicRef};

/// Live compose-preview state keyed by Boluo preview id, owning its own lock.
#[derive(Default)]
pub struct PreviewTracker {
    sessions: Mutex<HashMap<Uuid, PreviewSession>>,
}

impl PreviewTracker {
    async fn apply_keyframe(&self, preview: Preview) -> PreviewAction {
        let mut sessions = self.sessions.lock().await;
        let session = sessions
            .entry(preview.id)
            .or_insert_with(PreviewSession::new);
        session.keyframe_version = preview.version;
        session.current_version = preview.version;
        session.name = preview.name;
        session.text = preview.text;
        session.is_whisper = preview.whisper_to_users.is_some();
        session.clear = preview.clear;
        reconcile(&mut sessions, preview.id)
    }

    /// `None` when the diff is unknown, stale, or invalid, and should be dropped.
    async fn apply_diff(&self, patch: &PreviewDiffPost) -> Option<PreviewAction> {
        let mut sessions = self.sessions.lock().await;
        let session = sessions.get_mut(&patch.id)?;
        if patch.keyframe_version != session.keyframe_version
            || patch.version <= session.current_version
        {
            return None;
        }
        let (text, name) = apply_diff_ops(session.text.as_deref(), &session.name, &patch.op)?;
        session.text = text;
        session.name = name;
        session.current_version = patch.version;
        Some(reconcile(&mut sessions, patch.id))
    }

    async fn set_message_id(&self, preview_id: Uuid, tg_message_id: i32) {
        if let Some(session) = self.sessions.lock().await.get_mut(&preview_id) {
            session.tg_message_id = Some(tg_message_id);
        }
    }

    async fn take_message_id(&self, preview_id: Uuid) -> Option<i32> {
        self.sessions
            .lock()
            .await
            .remove(&preview_id)
            .and_then(|session| session.tg_message_id)
    }
}

struct PreviewSession {
    /// The keyframe version that diffs are applied on top of.
    keyframe_version: u16,
    /// Latest applied version; updates at or below this are dropped.
    current_version: u16,
    name: String,
    text: Option<String>,
    is_whisper: bool,
    clear: bool,
    tg_message_id: Option<i32>,
    /// Last body shown, so an unchanged keyframe skips a redundant edit.
    last_body: Option<String>,
}

impl PreviewSession {
    fn new() -> Self {
        PreviewSession {
            keyframe_version: 0,
            current_version: 0,
            name: String::new(),
            text: None,
            is_whisper: false,
            clear: false,
            tg_message_id: None,
            last_body: None,
        }
    }
}

/// What the Telegram side should do in response to a preview update.
enum PreviewAction {
    Create(String),
    Edit(i32, String),
    Delete(i32),
    None,
}

pub async fn sync_preview(
    bridge: &Bridge,
    binding: Binding,
    channel_id: Uuid,
    preview: Preview,
) -> Result<()> {
    if preview.sender_id == bridge.boluo.user_id() {
        return Ok(());
    }
    // A topic exists only while its channel is public, so its presence gates
    // visibility without a per-keystroke membership check against Boluo.
    let Some(topic) = bridge.store.get_topic(binding, channel_id).await? else {
        return Ok(());
    };
    let preview_id = preview.id;
    let action = bridge.previews.apply_keyframe(preview).await;
    perform_preview_action(bridge, topic, preview_id, action).await;
    Ok(())
}

pub async fn sync_preview_diff(
    bridge: &Bridge,
    binding: Binding,
    channel_id: Uuid,
    diff: PreviewDiff,
) -> Result<()> {
    if diff.sender == bridge.boluo.user_id() {
        return Ok(());
    }
    let Some(topic) = bridge.store.get_topic(binding, channel_id).await? else {
        return Ok(());
    };
    let patch = diff.payload;
    if let Some(action) = bridge.previews.apply_diff(&patch).await {
        perform_preview_action(bridge, topic, patch.id, action).await;
    }
    Ok(())
}

/// Deletes a preview's mirror message once its real message has been sent, which
/// Boluo signals through the sent message's `preview_id`.
pub async fn clear_preview(bridge: &Bridge, binding: Binding, preview_id: Uuid) -> Result<()> {
    let Some(tg_message_id) = bridge.previews.take_message_id(preview_id).await else {
        return Ok(());
    };
    if let Err(error) = delete_message(bridge, binding.tg_chat_id, tg_message_id).await {
        debug!(error = ?error, "failed to delete preview message after send");
    }
    Ok(())
}

fn reconcile(sessions: &mut HashMap<Uuid, PreviewSession>, preview_id: Uuid) -> PreviewAction {
    let Some(session) = sessions.get_mut(&preview_id) else {
        return PreviewAction::None;
    };
    match preview_body(
        &session.name,
        session.text.as_deref(),
        session.is_whisper,
        session.clear,
    ) {
        None => {
            let tg_message_id = session.tg_message_id;
            sessions.remove(&preview_id);
            match tg_message_id {
                Some(tg_message_id) => PreviewAction::Delete(tg_message_id),
                None => PreviewAction::None,
            }
        }
        Some(body) => {
            if session.last_body.as_deref() == Some(body.as_str()) {
                return PreviewAction::None;
            }
            session.last_body = Some(body.clone());
            match session.tg_message_id {
                Some(tg_message_id) => PreviewAction::Edit(tg_message_id, body),
                None => PreviewAction::Create(body),
            }
        }
    }
}

/// `None` means nothing should be shown: a whisper, or a cleared or blank preview.
fn preview_body(name: &str, text: Option<&str>, is_whisper: bool, clear: bool) -> Option<String> {
    if is_whisper || clear {
        return None;
    }
    let text = text?;
    if text.trim().is_empty() {
        return None;
    }
    Some(truncate_to(
        format!("{PREVIEW_PREFIX}{name}: {text}"),
        TELEGRAM_TEXT_LIMIT,
    ))
}

/// Replays diff ops on the keyframe to rebuild text and name. Splice indices are
/// UTF-16 code-unit offsets, matching the web client's edits.
fn apply_diff_ops(
    base_text: Option<&str>,
    base_name: &str,
    ops: &[PreviewDiffOp],
) -> Option<(Option<String>, String)> {
    let mut units: Vec<u16> = base_text
        .map(|t| t.encode_utf16().collect())
        .unwrap_or_default();
    let mut text_changed = false;
    let mut name = base_name.to_string();
    for op in ops {
        match op {
            PreviewDiffOp::Splice { i, len, text } => {
                let start = *i as usize;
                let end = start.checked_add(*len as usize)?;
                if end > units.len() {
                    return None;
                }
                units.splice(start..end, text.encode_utf16());
                text_changed = true;
            }
            PreviewDiffOp::Append { text } => {
                units.extend(text.encode_utf16());
                text_changed = true;
            }
            PreviewDiffOp::ChangeName { name: new_name } => {
                name = new_name.clone();
            }
        }
    }
    if text_changed && base_text.is_none() {
        return None;
    }
    let text = if text_changed {
        Some(String::from_utf16(&units).ok()?)
    } else {
        base_text.map(str::to_string)
    };
    Some((text, name))
}

async fn perform_preview_action(
    bridge: &Bridge,
    topic: TopicRef,
    preview_id: Uuid,
    action: PreviewAction,
) {
    // Previews fire on every keystroke and are cosmetic, so failures log at debug.
    match action {
        PreviewAction::Create(body) => match send_preview_message(bridge, topic, &body).await {
            Ok(tg_message_id) => {
                bridge
                    .previews
                    .set_message_id(preview_id, tg_message_id)
                    .await
            }
            Err(error) => debug!(error = ?error, "failed to send preview message"),
        },
        PreviewAction::Edit(tg_message_id, body) => {
            if let Err(error) =
                edit_preview_message(bridge, topic.tg_chat_id, tg_message_id, &body).await
            {
                debug!(error = ?error, "failed to edit preview message");
            }
        }
        PreviewAction::Delete(tg_message_id) => {
            if let Err(error) = delete_message(bridge, topic.tg_chat_id, tg_message_id).await {
                debug!(error = ?error, "failed to delete preview message");
            }
        }
        PreviewAction::None => {}
    }
}

/// Posted silently so a per-keystroke edit does not buzz the group.
async fn send_preview_message(bridge: &Bridge, topic: TopicRef, body: &str) -> Result<i32> {
    let params = SendMessageParams::builder()
        .chat_id(topic.tg_chat_id)
        .message_thread_id(topic.message_thread_id)
        .text(body)
        .disable_notification(true)
        .build();
    let sent = bridge
        .tg
        .send_message(&params)
        .await
        .context("preview sendMessage failed")?;
    Ok(sent.result.message_id)
}

async fn edit_preview_message(
    bridge: &Bridge,
    tg_chat_id: i64,
    tg_message_id: i32,
    body: &str,
) -> Result<()> {
    let params = EditMessageTextParams::builder()
        .chat_id(tg_chat_id)
        .message_id(tg_message_id)
        .text(body)
        .build();
    bridge
        .tg
        .edit_message_text(&params)
        .await
        .context("preview editMessageText failed")?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preview_body_hides_whisper_cleared_and_blank_previews() {
        assert!(preview_body("Alice", Some("hi"), true, false).is_none());
        assert!(preview_body("Alice", Some("hi"), false, true).is_none());
        assert!(preview_body("Alice", Some("   "), false, false).is_none());
        assert!(preview_body("Alice", None, false, false).is_none());
        assert_eq!(
            preview_body("Alice", Some("hi"), false, false).as_deref(),
            Some("[Preview] Alice: hi")
        );
    }

    #[test]
    fn diff_ops_splice_append_and_rename() {
        let ops = vec![
            PreviewDiffOp::Splice {
                i: 0,
                len: 5,
                text: "hi".to_string(),
            },
            PreviewDiffOp::Append {
                text: " there".to_string(),
            },
            PreviewDiffOp::ChangeName {
                name: "Bob".to_string(),
            },
        ];
        let (text, name) = apply_diff_ops(Some("hello"), "Alice", &ops).unwrap();
        assert_eq!(text.as_deref(), Some("hi there"));
        assert_eq!(name, "Bob");
    }

    #[test]
    fn diff_ops_use_utf16_offsets_across_a_surrogate_pair() {
        // "😀" is two UTF-16 code units, so offset 2 lands right after it.
        let ops = vec![PreviewDiffOp::Splice {
            i: 2,
            len: 0,
            text: "!".to_string(),
        }];
        let (text, _) = apply_diff_ops(Some("😀"), "Alice", &ops).unwrap();
        assert_eq!(text.as_deref(), Some("😀!"));
    }

    #[test]
    fn diff_ops_reject_an_out_of_range_splice() {
        let ops = vec![PreviewDiffOp::Splice {
            i: 99,
            len: 1,
            text: "x".to_string(),
        }];
        assert!(apply_diff_ops(Some("hi"), "Alice", &ops).is_none());
    }

    #[test]
    fn diff_ops_reject_splitting_a_surrogate_pair() {
        // Offset 1 falls inside "😀", so the result would be invalid UTF-16.
        let ops = vec![PreviewDiffOp::Splice {
            i: 1,
            len: 1,
            text: "x".to_string(),
        }];
        assert!(apply_diff_ops(Some("😀"), "Alice", &ops).is_none());
    }

    #[test]
    fn diff_ops_rename_without_a_text_base() {
        let ops = vec![PreviewDiffOp::ChangeName {
            name: "Bob".to_string(),
        }];
        let (text, name) = apply_diff_ops(None, "Alice", &ops).unwrap();
        assert!(text.is_none());
        assert_eq!(name, "Bob");
    }

    #[test]
    fn diff_ops_reject_a_text_edit_without_a_base() {
        let ops = vec![PreviewDiffOp::Append {
            text: "x".to_string(),
        }];
        assert!(apply_diff_ops(None, "Alice", &ops).is_none());
    }
}
