//! The confirm-before-send flow: a Telegram text message is staged as a Boluo
//! compose preview and only posted for real once its author taps Send. The
//! staged state lives in memory only.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use anyhow::{Context, Result};
use frankenstein::AsyncTelegramApi;
use frankenstein::methods::{AnswerCallbackQueryParams, EditMessageTextParams, SendMessageParams};
use frankenstein::types::{
    CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message, MessageEntity, ReplyMarkup,
};
use tokio::sync::Mutex;
use tracing::{debug, warn};
use uuid::Uuid;

use super::{PREVIEW_PREFIX, delete_message, sender_name, telegram_text, truncate_telegram_text};
use crate::Bridge;
use crate::boluo::{plain_message_with_preview, preview_frame};
use crate::store::{Binding, TopicRef};

/// Inactivity (no edit, no Send) after which a staged message is auto-cancelled.
const PENDING_TIMEOUT: Duration = Duration::from_secs(5 * 60);
const SEND_BUTTON_LABEL: &str = "Send";
const CANCEL_BUTTON_LABEL: &str = "Cancel";

/// Staged messages awaiting Send, keyed by Boluo preview id, owning its own lock.
#[derive(Default)]
pub struct OutboundTracker {
    inner: Mutex<OutboundState>,
}

#[derive(Default)]
struct OutboundState {
    by_preview: HashMap<Uuid, PendingOutbound>,
    /// `(tg_chat_id, author message id)` → preview id.
    by_tg_message: HashMap<(i64, i32), Uuid>,
}

struct PendingOutbound {
    binding: Binding,
    channel_id: Uuid,
    topic: TopicRef,
    /// The only user allowed to confirm, cancel, or edit.
    author_tg_user_id: u64,
    name: String,
    text: String,
    version: u16,
    /// Bumped on every edit; a timeout fires only if it still matches, so a
    /// timer from before an edit is a no-op.
    generation: u64,
    /// The author's original message.
    user_tg_message_id: i32,
    /// The bot's `[Preview]` message.
    preview_tg_message_id: i32,
}

/// [`OutboundTracker::stage_edit`]'s return, so the effects (Boluo preview,
/// Telegram edit, timer) run outside the lock.
struct EditStaged {
    binding_id: i64,
    channel_id: Uuid,
    topic: TopicRef,
    name: String,
    text: String,
    preview_tg_message_id: i32,
    version: u16,
    generation: u64,
}

impl OutboundTracker {
    async fn insert(&self, preview_id: Uuid, pending: PendingOutbound) {
        let mut state = self.inner.lock().await;
        let key = (pending.topic.tg_chat_id, pending.user_tg_message_id);
        state.by_preview.insert(preview_id, pending);
        state.by_tg_message.insert(key, preview_id);
    }

    pub(super) async fn preview_id_for_message(
        &self,
        tg_chat_id: i64,
        tg_message_id: i32,
    ) -> Option<Uuid> {
        self.inner
            .lock()
            .await
            .by_tg_message
            .get(&(tg_chat_id, tg_message_id))
            .copied()
    }

    /// `None` if the message is no longer pending.
    async fn stage_edit(&self, preview_id: Uuid, text: String) -> Option<EditStaged> {
        let mut state = self.inner.lock().await;
        let pending = state.by_preview.get_mut(&preview_id)?;
        pending.text = text.clone();
        pending.version = pending.version.wrapping_add(1);
        pending.generation = pending.generation.wrapping_add(1);
        Some(EditStaged {
            binding_id: pending.binding.id,
            channel_id: pending.channel_id,
            topic: pending.topic,
            name: pending.name.clone(),
            text,
            preview_tg_message_id: pending.preview_tg_message_id,
            version: pending.version,
            generation: pending.generation,
        })
    }

    async fn author(&self, preview_id: Uuid) -> Option<u64> {
        self.inner
            .lock()
            .await
            .by_preview
            .get(&preview_id)
            .map(|pending| pending.author_tg_user_id)
    }

    async fn take(&self, preview_id: Uuid) -> Option<PendingOutbound> {
        let mut state = self.inner.lock().await;
        take_pending(&mut state, preview_id)
    }

    /// Takes it only if its generation still matches, so a stale timeout is a no-op.
    async fn take_if_generation(
        &self,
        preview_id: Uuid,
        generation: u64,
    ) -> Option<PendingOutbound> {
        let mut state = self.inner.lock().await;
        match state.by_preview.get(&preview_id) {
            Some(pending) if pending.generation == generation => {
                take_pending(&mut state, preview_id)
            }
            _ => None,
        }
    }
}

fn take_pending(state: &mut OutboundState, preview_id: Uuid) -> Option<PendingOutbound> {
    let pending = state.by_preview.remove(&preview_id)?;
    state
        .by_tg_message
        .remove(&(pending.topic.tg_chat_id, pending.user_tg_message_id));
    Some(pending)
}

/// Stages a Telegram text message as a Boluo preview and posts the `[Preview]`
/// message with Send/Cancel buttons, rather than forwarding it straight away.
pub(super) async fn begin_pending_outbound(
    bridge: &Arc<Bridge>,
    binding: Binding,
    channel_id: Uuid,
    topic: TopicRef,
    msg: &Message,
) -> Result<()> {
    let Some(text) = msg.text.clone() else {
        return Ok(());
    };
    let Some(author_tg_user_id) = msg.from.as_ref().map(|user| user.id) else {
        return Ok(());
    };
    let name = sender_name(msg);
    let preview_id = Uuid::new_v4();
    let version = 1;

    // Best effort: the confirm flow still works if the socket is momentarily down.
    send_ws_frame(
        bridge,
        binding.id,
        preview_frame(channel_id, preview_id, version, &name, Some(&text), false),
    );

    let body = truncate_telegram_text(format!("{PREVIEW_PREFIX}{name}: {text}"));
    let preview_tg_message_id = send_pending_message(bridge, topic, &body, preview_id).await?;

    bridge
        .outbound
        .insert(
            preview_id,
            PendingOutbound {
                binding,
                channel_id,
                topic,
                author_tg_user_id,
                name,
                text,
                version,
                generation: 0,
                user_tg_message_id: msg.message_id,
                preview_tg_message_id,
            },
        )
        .await;
    schedule_pending_timeout(bridge.clone(), preview_id, 0);
    Ok(())
}

/// Re-stages an edited pending message: a fresh keyframe, the `[Preview]` message
/// re-rendered, and the timer reset. Editing text drops the keyboard, so the
/// buttons are re-attached.
pub(super) async fn update_pending_outbound(
    bridge: &Arc<Bridge>,
    preview_id: Uuid,
    msg: &Message,
) -> Result<()> {
    let Some(text) = msg.text.clone() else {
        return Ok(());
    };
    let Some(staged) = bridge.outbound.stage_edit(preview_id, text).await else {
        return Ok(());
    };

    send_ws_frame(
        bridge,
        staged.binding_id,
        preview_frame(
            staged.channel_id,
            preview_id,
            staged.version,
            &staged.name,
            Some(&staged.text),
            false,
        ),
    );
    let body = truncate_telegram_text(format!("{PREVIEW_PREFIX}{}: {}", staged.name, staged.text));
    let params = EditMessageTextParams::builder()
        .chat_id(staged.topic.tg_chat_id)
        .message_id(staged.preview_tg_message_id)
        .text(body)
        .reply_markup(pending_keyboard(preview_id))
        .build();
    bridge
        .tg
        .edit_message_text(&params)
        .await
        .context("failed to update pending preview message")?;
    schedule_pending_timeout(bridge.clone(), preview_id, staged.generation);
    Ok(())
}

enum CallbackAction {
    Send,
    Cancel,
}

/// Parses a button's callback data, encoded as `s:<id>` (Send) or `c:<id>` (Cancel).
fn parse_callback_data(data: &str) -> Option<(CallbackAction, Uuid)> {
    let (tag, id) = data.split_once(':')?;
    let action = match tag {
        "s" => CallbackAction::Send,
        "c" => CallbackAction::Cancel,
        _ => return None,
    };
    Some((action, Uuid::parse_str(id).ok()?))
}

/// Handles a Send or Cancel tap from the message's author only.
pub(super) async fn handle_callback_query(
    bridge: &Arc<Bridge>,
    query: CallbackQuery,
) -> Result<()> {
    let Some((action, preview_id)) = query.data.as_deref().and_then(parse_callback_data) else {
        answer_callback(bridge, &query.id, None).await;
        return Ok(());
    };

    // Check authorship before taking, so a non-author's tap leaves it pending.
    if matches!(bridge.outbound.author(preview_id).await, Some(author) if author != query.from.id) {
        answer_callback(bridge, &query.id, Some("Only the sender can do this.")).await;
        return Ok(());
    }

    let Some(pending) = bridge.outbound.take(preview_id).await else {
        answer_callback(
            bridge,
            &query.id,
            Some("This message is no longer pending."),
        )
        .await;
        return Ok(());
    };

    match action {
        CallbackAction::Send => match send_pending_to_boluo(bridge, preview_id, &pending).await {
            Ok(()) => answer_callback(bridge, &query.id, None).await,
            Err(error) => {
                warn!(error = %error, "failed to send confirmed message to Boluo");
                // Clean up so nothing is orphaned, and let the author retry.
                cancel_pending(bridge, preview_id, pending).await;
                answer_callback(bridge, &query.id, Some("Sending failed. Please resend.")).await;
            }
        },
        CallbackAction::Cancel => {
            cancel_pending(bridge, preview_id, pending).await;
            answer_callback(bridge, &query.id, None).await;
        }
    }
    Ok(())
}

/// Posts the confirmed message, then leaves one clean copy: the `[Preview]`
/// message becomes the final forwarded message and the author's raw message is
/// deleted. If that delete is denied, the raw message is kept and the bot message
/// removed instead.
async fn send_pending_to_boluo(
    bridge: &Bridge,
    preview_id: Uuid,
    pending: &PendingOutbound,
) -> Result<()> {
    let boluo_message_id = bridge
        .boluo
        .send_message(&plain_message_with_preview(
            pending.channel_id,
            pending.name.clone(),
            pending.text.clone(),
            preview_id,
        ))
        .await
        .context("failed to post confirmed message to Boluo")?;

    let user_message_deleted =
        delete_message(bridge, pending.topic.tg_chat_id, pending.user_tg_message_id)
            .await
            .is_ok();
    let tg_message_id = if user_message_deleted {
        let (body, entities) = telegram_text(&pending.name, &pending.text, false)?;
        finalize_preview_message(
            bridge,
            pending.topic.tg_chat_id,
            pending.preview_tg_message_id,
            body,
            entities,
        )
        .await?;
        pending.preview_tg_message_id
    } else {
        if let Err(error) = delete_message(
            bridge,
            pending.topic.tg_chat_id,
            pending.preview_tg_message_id,
        )
        .await
        {
            debug!(error = ?error, "failed to remove preview control message");
        }
        pending.user_tg_message_id
    };
    bridge
        .store
        .record_message(
            pending.binding.id,
            boluo_message_id,
            tg_message_id,
            false,
            None,
        )
        .await?;
    Ok(())
}

/// Cancels the Boluo preview and removes both Telegram messages. Used on timeout
/// and when a confirmed send fails.
async fn cancel_pending(bridge: &Bridge, preview_id: Uuid, pending: PendingOutbound) {
    send_ws_frame(
        bridge,
        pending.binding.id,
        preview_frame(
            pending.channel_id,
            preview_id,
            pending.version.wrapping_add(1),
            &pending.name,
            None,
            true,
        ),
    );
    for tg_message_id in [pending.preview_tg_message_id, pending.user_tg_message_id] {
        if let Err(error) = delete_message(bridge, pending.topic.tg_chat_id, tg_message_id).await {
            debug!(error = ?error, "failed to delete staged message on cancel");
        }
    }
}

/// Only the timer whose generation still matches fires; edits bump it.
fn schedule_pending_timeout(bridge: Arc<Bridge>, preview_id: Uuid, generation: u64) {
    tokio::spawn(async move {
        tokio::time::sleep(PENDING_TIMEOUT).await;
        if let Some(pending) = bridge
            .outbound
            .take_if_generation(preview_id, generation)
            .await
        {
            cancel_pending(&bridge, preview_id, pending).await;
        }
    });
}

fn pending_keyboard(preview_id: Uuid) -> InlineKeyboardMarkup {
    let send = InlineKeyboardButton::builder()
        .text(SEND_BUTTON_LABEL)
        .callback_data(format!("s:{preview_id}"))
        .build();
    let cancel = InlineKeyboardButton::builder()
        .text(CANCEL_BUTTON_LABEL)
        .callback_data(format!("c:{preview_id}"))
        .build();
    InlineKeyboardMarkup::builder()
        .inline_keyboard(vec![vec![send, cancel]])
        .build()
}

/// Silent, so a per-keystroke edit does not buzz the group.
async fn send_pending_message(
    bridge: &Bridge,
    topic: TopicRef,
    body: &str,
    preview_id: Uuid,
) -> Result<i32> {
    let params = SendMessageParams::builder()
        .chat_id(topic.tg_chat_id)
        .message_thread_id(topic.message_thread_id)
        .text(body)
        .disable_notification(true)
        .reply_markup(ReplyMarkup::InlineKeyboardMarkup(pending_keyboard(
            preview_id,
        )))
        .build();
    let sent = bridge
        .tg
        .send_message(&params)
        .await
        .context("pending sendMessage failed")?;
    Ok(sent.result.message_id)
}

async fn finalize_preview_message(
    bridge: &Bridge,
    tg_chat_id: i64,
    tg_message_id: i32,
    body: String,
    entities: Option<Vec<MessageEntity>>,
) -> Result<()> {
    // Omitting reply_markup removes the inline keyboard.
    let builder = EditMessageTextParams::builder()
        .chat_id(tg_chat_id)
        .message_id(tg_message_id)
        .text(body);
    let params = match entities {
        Some(entities) => builder.entities(entities).build(),
        None => builder.build(),
    };
    bridge
        .tg
        .edit_message_text(&params)
        .await
        .context("failed to finalize preview message")?;
    Ok(())
}

async fn answer_callback(bridge: &Bridge, callback_query_id: &str, text: Option<&str>) {
    let builder = AnswerCallbackQueryParams::builder().callback_query_id(callback_query_id);
    let params = match text {
        Some(text) => builder.text(text).show_alert(true).build(),
        None => builder.build(),
    };
    if let Err(error) = bridge.tg.answer_callback_query(&params).await {
        debug!(error = ?error, "failed to answer callback query");
    }
}

fn send_ws_frame(bridge: &Bridge, binding_id: i64, frame: String) {
    let Ok(senders) = bridge.ws_senders.lock() else {
        return;
    };
    match senders.get(&binding_id) {
        Some(sender) if sender.send(frame).is_ok() => {}
        _ => debug!(binding_id, "no live WebSocket for preview frame; skipping"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pending_keyboard_carries_send_and_cancel_actions() {
        let preview_id = Uuid::new_v4();
        let markup = pending_keyboard(preview_id);

        let row = &markup.inline_keyboard[0];
        assert_eq!(row[0].text, SEND_BUTTON_LABEL);
        assert_eq!(row[1].text, CANCEL_BUTTON_LABEL);

        let (send_action, send_id) =
            parse_callback_data(row[0].callback_data.as_deref().unwrap()).unwrap();
        assert!(matches!(send_action, CallbackAction::Send));
        assert_eq!(send_id, preview_id);
        let (cancel_action, cancel_id) =
            parse_callback_data(row[1].callback_data.as_deref().unwrap()).unwrap();
        assert!(matches!(cancel_action, CallbackAction::Cancel));
        assert_eq!(cancel_id, preview_id);
    }

    #[test]
    fn parse_callback_data_rejects_unknown_tags() {
        assert!(parse_callback_data(&Uuid::new_v4().to_string()).is_none());
        assert!(parse_callback_data(&format!("x:{}", Uuid::new_v4())).is_none());
        assert!(parse_callback_data("s:not-a-uuid").is_none());
    }
}
