//! Telegram polling, commands, permissions, and message formatting.

mod outbound;
mod preview;

use std::collections::HashSet;
use std::sync::Arc;
use std::time::Duration;

use anyhow::{Context, Result, anyhow};
use frankenstein::AsyncTelegramApi;
use frankenstein::methods::{
    DeleteForumTopicParams, DeleteMessageParams, EditForumTopicParams, EditMessageCaptionParams,
    EditMessageTextParams, GetChatAdministratorsParams, GetChatParams, GetFileParams,
    GetUpdatesParams, SendDocumentParams, SendMessageParams, SendPhotoParams,
};
use frankenstein::types::{ChatMember, ChatType, Message, MessageEntity, MessageEntityType};
use frankenstein::updates::UpdateContent;
use tracing::{info, warn};
use uuid::Uuid;

pub use outbound::OutboundTracker;
pub use preview::{PreviewTracker, clear_preview, sync_preview, sync_preview_diff};

use crate::boluo::{SpaceLookup, plain_message};
use crate::store::{Binding, TopicRef};
use crate::{
    Bridge, PauseBinding, ensure_topic, start_binding_worker, stop_binding_worker, visible_channel,
};

const TELEGRAM_TEXT_LIMIT: usize = 4096;
const TELEGRAM_CAPTION_LIMIT: usize = 1024;
const TRUNCATION_HINT: &str = "\n\n… [truncated; view the full message in Boluo]";
const PREVIEW_PREFIX: &str = "[Preview] ";

pub async fn validate_binding_health(bridge: &Bridge, binding: Binding) -> Result<()> {
    let params = GetChatParams::builder().chat_id(binding.tg_chat_id).build();
    let chat = match bridge.tg.get_chat(&params).await {
        Ok(response) => response.result,
        Err(error) if telegram_access_is_gone(&error) => {
            return Err(PauseBinding(
                "I can no longer access the Telegram group. I may have been removed.".to_string(),
            )
            .into());
        }
        Err(error) => return Err(error).context("failed to check Telegram group"),
    };
    if !matches!(chat.type_field, ChatType::Group | ChatType::Supergroup) {
        return Err(PauseBinding("The Telegram chat is no longer a group.".to_string()).into());
    }
    if chat.is_forum != Some(true) {
        return Err(PauseBinding(
            "Topics are no longer enabled in the Telegram group.".to_string(),
        )
        .into());
    }

    let admins = telegram_administrators(bridge, binding.tg_chat_id).await?;
    match find_administrator(&admins, bridge.tg_user_id) {
        Some(ChatMember::Creator(_)) => Ok(()),
        Some(ChatMember::Administrator(admin)) if admin.can_manage_topics == Some(true) => Ok(()),
        Some(ChatMember::Administrator(_)) => Err(PauseBinding(
            "I no longer have the Telegram “Manage Topics” permission.".to_string(),
        )
        .into()),
        _ => Err(PauseBinding(
            "I am no longer an administrator of the Telegram group.".to_string(),
        )
        .into()),
    }
}

async fn telegram_administrators(bridge: &Bridge, tg_chat_id: i64) -> Result<Vec<ChatMember>> {
    let params = GetChatAdministratorsParams::builder()
        .chat_id(tg_chat_id)
        .return_bots(true)
        .build();
    match bridge.tg.get_chat_administrators(&params).await {
        Ok(response) => Ok(response.result),
        Err(error) if telegram_access_is_gone(&error) => Err(PauseBinding(
            "I can no longer access the Telegram group. I may have been removed.".to_string(),
        )
        .into()),
        Err(error) => Err(error).context("failed to list Telegram group administrators"),
    }
}

fn telegram_access_is_gone(error: &frankenstein::Error) -> bool {
    matches!(error, frankenstein::Error::Api(response) if matches!(response.error_code, 400 | 403))
}

fn find_administrator(admins: &[ChatMember], user_id: u64) -> Option<&ChatMember> {
    admins.iter().find(|member| match member {
        ChatMember::Creator(owner) => owner.user.id == user_id,
        ChatMember::Administrator(administrator) => administrator.user.id == user_id,
        _ => false,
    })
}

pub async fn forward_message(
    bridge: &Bridge,
    binding: Binding,
    channel_id: Uuid,
    message: &generated::Message,
) -> Result<()> {
    let Some(topic) = ensure_topic(bridge, binding, channel_id).await? else {
        return Ok(());
    };
    let is_whisper = message.whisper_to_users.is_some();
    // A whisper leaks neither its text nor its media.
    let (tg_message_id, tg_is_media) = match message.media_id {
        Some(media_id) if !is_whisper => {
            match forward_boluo_media(bridge, topic, media_id, &message.name, &message.text).await {
                Ok(tg_message_id) => (tg_message_id, true),
                Err(error) => {
                    warn!(error = %error, %media_id, "failed to forward Boluo media; sending text only");
                    (
                        send_text_message(bridge, topic, &message.name, &message.text, is_whisper)
                            .await?,
                        false,
                    )
                }
            }
        }
        _ => (
            send_text_message(bridge, topic, &message.name, &message.text, is_whisper).await?,
            false,
        ),
    };
    bridge
        .store
        .record_message(
            binding.id,
            message.id,
            tg_message_id,
            tg_is_media,
            message.media_id,
        )
        .await?;
    Ok(())
}

async fn send_text_message(
    bridge: &Bridge,
    topic: TopicRef,
    name: &str,
    text: &str,
    is_whisper: bool,
) -> Result<i32> {
    let (body, entities) = telegram_text(name, text, is_whisper)?;
    let params = SendMessageParams::builder()
        .chat_id(topic.tg_chat_id)
        .message_thread_id(topic.message_thread_id)
        .text(body);
    let params = match entities {
        Some(entities) => params.entities(entities).build(),
        None => params.build(),
    };
    let sent = bridge
        .tg
        .send_message(&params)
        .await
        .context("sendMessage failed")?;
    Ok(sent.result.message_id)
}

/// A media message's caption is edited; a text message's text is edited.
pub async fn edit_forwarded_message(
    bridge: &Bridge,
    binding: Binding,
    message: &generated::Message,
) -> Result<()> {
    let Some((tg_message_id, tg_is_media)) = bridge
        .store
        .tg_message_by_boluo(binding.id, message.id)
        .await?
    else {
        return Ok(());
    };
    let is_whisper = message.whisper_to_users.is_some();
    if tg_is_media && !is_whisper {
        let caption = truncate_to(
            format!("{}: {}", message.name, message.text),
            TELEGRAM_CAPTION_LIMIT,
        );
        let params = EditMessageCaptionParams::builder()
            .chat_id(binding.tg_chat_id)
            .message_id(tg_message_id)
            .caption(caption)
            .build();
        bridge
            .tg
            .edit_message_caption(&params)
            .await
            .context("editMessageCaption failed")?;
    } else {
        let (body, entities) = telegram_text(&message.name, &message.text, is_whisper)?;
        let builder = EditMessageTextParams::builder()
            .chat_id(binding.tg_chat_id)
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
            .context("editMessageText failed")?;
    }
    Ok(())
}

pub async fn delete_forwarded_message(
    bridge: &Bridge,
    binding: Binding,
    boluo_message_id: Uuid,
) -> Result<()> {
    let Some((tg_message_id, _)) = bridge
        .store
        .tg_message_by_boluo(binding.id, boluo_message_id)
        .await?
    else {
        return Ok(());
    };
    let params = DeleteMessageParams::builder()
        .chat_id(binding.tg_chat_id)
        .message_id(tg_message_id)
        .build();
    if let Err(error) = bridge.tg.delete_message(&params).await {
        warn!(error = %error, tg_message_id, "failed to delete Telegram message");
    }
    bridge
        .store
        .delete_message_map(binding.id, boluo_message_id)
        .await?;
    Ok(())
}

/// Deletes a Telegram message by id; shared by the preview and outbound flows.
pub(super) async fn delete_message(
    bridge: &Bridge,
    tg_chat_id: i64,
    tg_message_id: i32,
) -> Result<()> {
    let params = DeleteMessageParams::builder()
        .chat_id(tg_chat_id)
        .message_id(tg_message_id)
        .build();
    bridge
        .tg
        .delete_message(&params)
        .await
        .context("deleteMessage failed")?;
    Ok(())
}

/// Relays a Boluo attachment to a Telegram topic (images as photos, the rest as
/// documents), returning the new message id. frankenstein can only upload from a
/// path, so the bytes are staged in a temporary file that is removed afterward.
async fn forward_boluo_media(
    bridge: &Bridge,
    topic: TopicRef,
    media_id: Uuid,
    name: &str,
    text: &str,
) -> Result<i32> {
    let media = bridge.boluo.download_media(media_id).await?;
    let mime = media.mime.as_deref().unwrap_or("application/octet-stream");
    let caption = truncate_to(format!("{name}: {text}"), TELEGRAM_CAPTION_LIMIT);

    let dir = std::env::temp_dir().join(format!("boluo-bridge-{}", Uuid::new_v4()));
    tokio::fs::create_dir_all(&dir)
        .await
        .context("failed to create temporary media directory")?;
    let path = dir.join(media_file_name(media_id, mime));
    tokio::fs::write(&path, &media.bytes)
        .await
        .context("failed to stage media file")?;

    let result = if is_photo_mime(mime) {
        let params = SendPhotoParams::builder()
            .chat_id(topic.tg_chat_id)
            .message_thread_id(topic.message_thread_id)
            .photo(path.clone())
            .caption(caption)
            .build();
        bridge
            .tg
            .send_photo(&params)
            .await
            .map(|sent| sent.result.message_id)
            .context("sendPhoto failed")
    } else {
        let params = SendDocumentParams::builder()
            .chat_id(topic.tg_chat_id)
            .message_thread_id(topic.message_thread_id)
            .document(path.clone())
            .caption(caption)
            .build();
        bridge
            .tg
            .send_document(&params)
            .await
            .map(|sent| sent.result.message_id)
            .context("sendDocument failed")
    };

    if let Err(error) = tokio::fs::remove_dir_all(&dir).await {
        warn!(error = %error, "failed to remove temporary media directory");
    }
    result
}

/// Telegram only reliably renders JPEG/PNG inline as photos; GIF, WebP and
/// non-image files go out as documents.
fn is_photo_mime(mime: &str) -> bool {
    matches!(mime, "image/jpeg" | "image/png")
}

/// The staged file name; Telegram shows this as the document's name.
fn media_file_name(media_id: Uuid, mime: &str) -> String {
    match mime_extension(mime) {
        Some(extension) => format!("{media_id}.{extension}"),
        None => media_id.to_string(),
    }
}

fn mime_extension(mime: &str) -> Option<&'static str> {
    let extension = match mime.split(';').next()?.trim() {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/gif" => "gif",
        "image/webp" => "webp",
        "video/mp4" => "mp4",
        "video/webm" => "webm",
        "audio/mpeg" => "mp3",
        "audio/ogg" => "ogg",
        "application/pdf" => "pdf",
        _ => return None,
    };
    Some(extension)
}

pub async fn sync_channel(
    bridge: &Bridge,
    binding: Binding,
    channel: &generated::Channel,
) -> Result<()> {
    if !channel.is_public {
        return delete_channel_topic(bridge, binding, channel.id).await;
    }
    let Some(topic) = bridge.store.get_topic(binding, channel.id).await? else {
        return Ok(());
    };
    let params = EditForumTopicParams::builder()
        .chat_id(topic.tg_chat_id)
        .message_thread_id(topic.message_thread_id)
        .name(channel.name.clone())
        .build();
    bridge
        .tg
        .edit_forum_topic(&params)
        .await
        .with_context(|| format!("failed to rename Telegram topic for channel {}", channel.id))?;
    info!(channel_id = %channel.id, name = channel.name, "renamed Telegram topic");
    Ok(())
}

pub async fn delete_channel_topic(
    bridge: &Bridge,
    binding: Binding,
    channel_id: Uuid,
) -> Result<()> {
    let Some(topic) = bridge.store.get_topic(binding, channel_id).await? else {
        return Ok(());
    };
    delete_forum_topic(bridge, topic).await?;
    bridge.store.delete_topic(binding.id, channel_id).await?;
    info!(%channel_id, thread = topic.message_thread_id, "deleted Telegram topic");
    Ok(())
}

pub async fn delete_all_topics(bridge: &Bridge, binding: Binding) -> Result<()> {
    for mapped in bridge.store.topics(binding).await? {
        delete_forum_topic(bridge, mapped.topic).await?;
        bridge
            .store
            .delete_topic(binding.id, mapped.channel_id)
            .await?;
    }
    Ok(())
}

pub async fn sync_space_channels(
    bridge: &Bridge,
    binding: Binding,
    channels: &[generated::Channel],
) -> Result<()> {
    let channel_ids: HashSet<_> = channels.iter().map(|channel| channel.id).collect();
    for channel in channels {
        sync_channel(bridge, binding, channel).await?;
    }
    for mapped in bridge.store.topics(binding).await? {
        if !channel_ids.contains(&mapped.channel_id) {
            delete_channel_topic(bridge, binding, mapped.channel_id).await?;
        }
    }
    Ok(())
}

async fn delete_forum_topic(bridge: &Bridge, topic: TopicRef) -> Result<()> {
    let params = DeleteForumTopicParams::builder()
        .chat_id(topic.tg_chat_id)
        .message_thread_id(topic.message_thread_id)
        .build();
    bridge
        .tg
        .delete_forum_topic(&params)
        .await
        .context("failed to delete Telegram topic")?;
    Ok(())
}

fn telegram_text(
    name: &str,
    text: &str,
    is_whisper: bool,
) -> Result<(String, Option<Vec<MessageEntity>>)> {
    if !is_whisper {
        return Ok((truncate_telegram_text(format!("{name}: {text}")), None));
    }

    let body = format!("{name} is whispering…");
    let length = u16::try_from(body.encode_utf16().count())
        .context("whisper notice is too long for Telegram formatting")?;
    let italic = MessageEntity::builder()
        .type_field(MessageEntityType::Italic)
        .offset(0u16)
        .length(length)
        .build();
    Ok((body, Some(vec![italic])))
}

fn truncate_telegram_text(text: String) -> String {
    truncate_to(text, TELEGRAM_TEXT_LIMIT)
}

fn truncate_to(mut text: String, limit: usize) -> String {
    if text.encode_utf16().count() <= limit {
        return text;
    }

    let hint_len = TRUNCATION_HINT.encode_utf16().count();
    let content_limit = limit.saturating_sub(hint_len);
    let mut utf16_len = 0;
    let mut truncate_at = 0;
    for (index, character) in text.char_indices() {
        let next_len = utf16_len + character.len_utf16();
        if next_len > content_limit {
            break;
        }
        utf16_len = next_len;
        truncate_at = index + character.len_utf8();
    }
    text.truncate(truncate_at);
    text.push_str(TRUNCATION_HINT);
    text
}

pub async fn run(bridge: Arc<Bridge>) -> Result<()> {
    let mut offset: i64 = 0;
    loop {
        let params = GetUpdatesParams::builder()
            .offset(offset)
            .timeout(30u32)
            .build();
        let updates = match bridge.tg.get_updates(&params).await {
            Ok(resp) => resp.result,
            Err(e) => {
                warn!(error = %e, "getUpdates failed; retrying in 5s");
                tokio::time::sleep(Duration::from_secs(5)).await;
                continue;
            }
        };
        for update in updates {
            offset = offset.max(i64::from(update.update_id) + 1);
            if let Err(e) = handle_update(&bridge, update.content).await {
                warn!(error = %e, "failed to handle Telegram update");
            }
        }
    }
}

async fn handle_update(bridge: &Arc<Bridge>, content: UpdateContent) -> Result<()> {
    match content {
        UpdateContent::Message(msg) => handle_message(bridge, *msg).await,
        UpdateContent::EditedMessage(msg) => handle_edited_message(bridge, *msg).await,
        UpdateContent::CallbackQuery(query) => {
            outbound::handle_callback_query(bridge, *query).await
        }
        _ => Ok(()),
    }
}

async fn handle_message(bridge: &Arc<Bridge>, msg: Message) -> Result<()> {
    if msg.from.as_ref().is_some_and(|u| u.is_bot) {
        return Ok(());
    }

    // Commands and invite links are text-only; a media message carries a
    // caption, not `text`, so it skips this block and goes straight to forwarding.
    if let Some(text) = msg.text.clone() {
        if let Some(target) = parse_bind_command(&text) {
            let response = match target {
                Ok((space_id, token)) => match bind_group(bridge, &msg, space_id, token).await {
                    Ok(response) => response,
                    Err(error) => {
                        warn!(error = %error, group = msg.chat.id, %space_id, "failed to bind Telegram group");
                        "Binding failed because of an internal error. Check the bridge logs and try again."
                            .to_string()
                    }
                },
                Err(message) => message,
            };
            send_notice(bridge, msg.chat.id, msg.message_thread_id, response).await?;
            return Ok(());
        }
        if let Some(command) = parse_unbind_command(&text) {
            let response = match command {
                Ok(()) => match unbind_group(bridge, &msg).await {
                    Ok(response) => response,
                    Err(error) => {
                        warn!(error = %error, group = msg.chat.id, "failed to unbind Telegram group");
                        "Unbinding failed because of an internal error. Check the bridge logs and try again."
                            .to_string()
                    }
                },
                Err(message) => message,
            };
            send_notice(bridge, msg.chat.id, msg.message_thread_id, response).await?;
            return Ok(());
        }

        // In a private chat the bot only acts on invite links: it joins the space.
        if matches!(msg.chat.type_field, ChatType::Private) {
            let response = join_space_from_link(bridge, &text).await;
            send_notice(bridge, msg.chat.id, None, response).await?;
            return Ok(());
        }
    } else if matches!(msg.chat.type_field, ChatType::Private) {
        return Ok(());
    }

    let Some(thread_id) = msg.message_thread_id else {
        return Ok(());
    };
    let Some((binding, channel_id)) = bridge
        .store
        .channel_for_topic(msg.chat.id, thread_id)
        .await?
    else {
        return Ok(());
    };
    if visible_channel(bridge, binding, channel_id)
        .await?
        .is_none()
    {
        info!(%channel_id, "ignoring Telegram message for hidden channel");
        return Ok(());
    }

    // Media forwards immediately; text is staged for confirmation before it posts.
    if incoming_media(&msg).is_some() {
        return forward_to_boluo(bridge, binding, channel_id, &msg).await;
    }
    if msg.text.is_some() {
        let topic = TopicRef {
            tg_chat_id: binding.tg_chat_id,
            message_thread_id: thread_id,
        };
        return outbound::begin_pending_outbound(bridge, binding, channel_id, topic, &msg).await;
    }
    Ok(())
}

/// Re-posts an edited Telegram message's text (or caption) to its Boluo message.
/// Telegram never notifies bots of deletions, so this direction syncs only edits.
async fn handle_edited_message(bridge: &Arc<Bridge>, msg: Message) -> Result<()> {
    if msg.from.as_ref().is_some_and(|u| u.is_bot) {
        return Ok(());
    }
    // A still-staged message: update its preview, not an already-sent message.
    if let Some(preview_id) = bridge
        .outbound
        .preview_id_for_message(msg.chat.id, msg.message_id)
        .await
    {
        return outbound::update_pending_outbound(bridge, preview_id, &msg).await;
    }
    let Some(thread_id) = msg.message_thread_id else {
        return Ok(());
    };
    let Some((binding, channel_id)) = bridge
        .store
        .channel_for_topic(msg.chat.id, thread_id)
        .await?
    else {
        return Ok(());
    };
    if visible_channel(bridge, binding, channel_id)
        .await?
        .is_none()
    {
        return Ok(());
    }
    let Some(mapped) = bridge
        .store
        .boluo_message_by_tg(binding.id, msg.message_id)
        .await?
    else {
        return Ok(());
    };

    let name = sender_name(&msg);
    let text = match incoming_media(&msg) {
        Some(media) => incoming_media_text(&msg, &media),
        None => match msg.text.clone() {
            Some(text) => text,
            None => return Ok(()),
        },
    };
    bridge
        .boluo
        .edit_message(mapped.boluo_message_id, &name, &text, mapped.boluo_media_id)
        .await
        .context("failed to edit Boluo message")?;
    Ok(())
}

/// Relays a Telegram group message to a Boluo channel and records the mapping
/// for later edit/delete sync. An attachment is uploaded and sent with its
/// caption (or a placeholder); otherwise the plain text is posted.
async fn forward_to_boluo(
    bridge: &Bridge,
    binding: Binding,
    channel_id: Uuid,
    msg: &Message,
) -> Result<()> {
    let name = sender_name(msg);
    let (boluo_message_id, boluo_media_id) = if let Some(media) = incoming_media(msg) {
        let media_id = upload_telegram_media(bridge, &media)
            .await
            .context("failed to upload Telegram media to Boluo")?;
        let text = incoming_media_text(msg, &media);
        let id = bridge
            .boluo
            .send_message(&plain_message(channel_id, name, text, Some(media_id)))
            .await
            .context("failed to post media message to Boluo")?;
        (id, Some(media_id))
    } else if let Some(text) = msg.text.clone() {
        let id = bridge
            .boluo
            .send_message(&plain_message(channel_id, name, text, None))
            .await
            .context("failed to post message to Boluo")?;
        (id, None)
    } else {
        return Ok(());
    };
    bridge
        .store
        .record_message(
            binding.id,
            boluo_message_id,
            msg.message_id,
            boluo_media_id.is_some(),
            boluo_media_id,
        )
        .await?;
    Ok(())
}

fn sender_name(msg: &Message) -> String {
    msg.from
        .as_ref()
        .map(|u| match &u.last_name {
            Some(last_name) => format!("{} {}", u.first_name, last_name),
            None => u.first_name.clone(),
        })
        .unwrap_or_else(|| "Telegram".to_string())
}

struct IncomingMedia {
    file_id: String,
    file_name: Option<String>,
    mime: Option<String>,
    /// Placeholder kind shown when the message has no caption.
    label: &'static str,
}

/// The attachment to forward, if any. A photo has several sizes; take the
/// largest (last).
fn incoming_media(msg: &Message) -> Option<IncomingMedia> {
    if let Some(photo) = msg.photo.as_ref().and_then(|sizes| sizes.last()) {
        return Some(IncomingMedia {
            file_id: photo.file_id.clone(),
            file_name: None,
            mime: Some("image/jpeg".to_string()),
            label: "Photo",
        });
    }
    if let Some(document) = msg.document.as_ref() {
        return Some(IncomingMedia {
            file_id: document.file_id.clone(),
            file_name: document.file_name.clone(),
            mime: document.mime_type.clone(),
            label: "File",
        });
    }
    if let Some(video) = msg.video.as_ref() {
        return Some(IncomingMedia {
            file_id: video.file_id.clone(),
            file_name: video.file_name.clone(),
            mime: video.mime_type.clone(),
            label: "Video",
        });
    }
    if let Some(audio) = msg.audio.as_ref() {
        return Some(IncomingMedia {
            file_id: audio.file_id.clone(),
            file_name: audio.file_name.clone(),
            mime: audio.mime_type.clone(),
            label: "Audio",
        });
    }
    if let Some(voice) = msg.voice.as_ref() {
        return Some(IncomingMedia {
            file_id: voice.file_id.clone(),
            file_name: None,
            mime: voice.mime_type.clone(),
            label: "Voice message",
        });
    }
    if let Some(animation) = msg.animation.as_ref() {
        return Some(IncomingMedia {
            file_id: animation.file_id.clone(),
            file_name: animation.file_name.clone(),
            mime: animation.mime_type.clone(),
            label: "GIF",
        });
    }
    None
}

/// The caption, or a placeholder when absent (Boluo rejects empty text).
fn incoming_media_text(msg: &Message, media: &IncomingMedia) -> String {
    match msg.caption.as_ref() {
        Some(caption) if !caption.trim().is_empty() => caption.clone(),
        _ => format!("[{}]", media.label),
    }
}

async fn upload_telegram_media(bridge: &Bridge, media: &IncomingMedia) -> Result<Uuid> {
    let params = GetFileParams::builder()
        .file_id(media.file_id.clone())
        .build();
    let file = bridge
        .tg
        .get_file(&params)
        .await
        .context("getFile failed")?
        .result;
    let file_path = file
        .file_path
        .ok_or_else(|| anyhow!("Telegram file has no path"))?;
    let url = format!(
        "https://api.telegram.org/file/bot{}/{}",
        bridge.tg_token, file_path
    );
    let bytes = bridge
        .http
        .get(&url)
        .send()
        .await
        .context("Telegram file download failed")?
        .error_for_status()
        .context("Telegram file download returned an error status")?
        .bytes()
        .await
        .context("failed to read Telegram file bytes")?
        .to_vec();

    let file_name = media
        .file_name
        .clone()
        .unwrap_or_else(|| file_name_from_path(&file_path));
    let mime = media
        .mime
        .clone()
        .unwrap_or_else(|| "application/octet-stream".to_string());
    bridge.boluo.upload_media(&file_name, &mime, bytes).await
}

fn file_name_from_path(file_path: &str) -> String {
    file_path
        .rsplit('/')
        .next()
        .filter(|name| !name.is_empty())
        .unwrap_or("file")
        .to_string()
}

/// Parses the first Boluo space invite link found in `text`, returning
/// `(space_id, token)`. The web app produces two link shapes:
///   `<site>/space/invite/<space_id>/<token>`
///   `<app>/<locale>#route=invite?spaceId=<space_id>&token=<token>`
fn parse_invite_link(text: &str) -> Option<(Uuid, Uuid)> {
    text.split_whitespace().find_map(parse_invite_url)
}

fn parse_invite_url(url: &str) -> Option<(Uuid, Uuid)> {
    if let Some(rest) = url.split("/space/invite/").nth(1) {
        let mut segments = rest.split('/');
        let space_id = Uuid::parse_str(segments.next()?).ok()?;
        let token = segments.next()?.split(['?', '#', '/']).next()?;
        let token = Uuid::parse_str(token).ok()?;
        return Some((space_id, token));
    }
    let space_id = query_param(url, "spaceId").and_then(|v| Uuid::parse_str(v).ok())?;
    let token = query_param(url, "token").and_then(|v| Uuid::parse_str(v).ok())?;
    Some((space_id, token))
}

fn query_param<'a>(url: &'a str, key: &str) -> Option<&'a str> {
    url.split(['?', '&', '#'])
        .find_map(|part| part.strip_prefix(key)?.strip_prefix('='))
}

async fn join_space_from_link(bridge: &Bridge, text: &str) -> String {
    let Some((space_id, token)) = parse_invite_link(text) else {
        return "Send me a Boluo space invite link and I'll join that space.".to_string();
    };
    match bridge.boluo.join_space(space_id, Some(token)).await {
        Ok(space) => {
            info!(%space_id, "joined Boluo space from invite link");
            format!("Joined Boluo space “{}” ({space_id}).", space.name)
        }
        Err(error) => {
            warn!(error = %error, %space_id, "failed to join Boluo space from invite link");
            format!(
                "I couldn't join that space ({space_id}). The invite link may be invalid or expired."
            )
        }
    }
}

/// Extracts a space ID from a bare UUID or any link carrying one (a space URL
/// or an invite link). A `spaceId` or `route` parameter wins; otherwise the
/// first UUID is taken, which is always the space ID in the links we accept.
fn parse_space_id(arg: &str) -> Option<Uuid> {
    for key in ["spaceId", "route"] {
        if let Some(space_id) = query_param(arg, key).and_then(|v| Uuid::parse_str(v).ok()) {
            return Some(space_id);
        }
    }
    find_uuid(arg)
}

fn find_uuid(text: &str) -> Option<Uuid> {
    text.split(|c: char| !c.is_ascii_hexdigit() && c != '-')
        .find_map(|part| Uuid::parse_str(part).ok())
}

/// Parses a `/bind` command into `(space_id, invite_token)`. The argument may
/// be a bare space ID, a space link, or an invite link. An invite link also
/// yields the token, which lets the bot join a private space without a DM.
#[allow(clippy::type_complexity)]
fn parse_bind_command(text: &str) -> Option<std::result::Result<(Uuid, Option<Uuid>), String>> {
    let mut parts = text.split_whitespace();
    let command = parts.next()?;
    if command.split('@').next() != Some("/bind") {
        return None;
    }
    let Some(arg) = parts.next() else {
        return Some(Err("Usage: /bind <space ID or link>".to_string()));
    };
    if parts.next().is_some() {
        return Some(Err("Usage: /bind <space ID or link>".to_string()));
    }
    if let Some((space_id, token)) = parse_invite_url(arg) {
        return Some(Ok((space_id, Some(token))));
    }
    Some(
        parse_space_id(arg)
            .map(|space_id| (space_id, None))
            .ok_or_else(|| {
                "I couldn't find a Boluo space ID there. Send /bind with the space ID, a space link, or an invite link."
                    .to_string()
            }),
    )
}

fn parse_unbind_command(text: &str) -> Option<std::result::Result<(), String>> {
    let mut parts = text.split_whitespace();
    let command = parts.next()?;
    if command.split('@').next() != Some("/unbind") {
        return None;
    }
    if parts.next().is_some() {
        return Some(Err("Usage: /unbind".to_string()));
    }
    Some(Ok(()))
}

enum JoinError {
    /// Membership check failed; worth retrying.
    MembershipCheck(anyhow::Error),
    /// Not a member, and joining failed.
    Failed(anyhow::Error),
}

/// Ensures the account is a member of a space the bot can already see, joining
/// it if needed with `token` when present.
async fn ensure_member(
    bridge: &Bridge,
    space_id: Uuid,
    token: Option<Uuid>,
) -> std::result::Result<(), JoinError> {
    match bridge.boluo.is_member(space_id).await {
        Ok(true) => Ok(()),
        Ok(false) => match bridge.boluo.join_space(space_id, token).await {
            Ok(_) => {
                info!(%space_id, "joined Boluo space while binding");
                Ok(())
            }
            Err(error) => Err(JoinError::Failed(error)),
        },
        Err(error) => Err(JoinError::MembershipCheck(error)),
    }
}

async fn bind_group(
    bridge: &Arc<Bridge>,
    message: &frankenstein::types::Message,
    space_id: Uuid,
    token: Option<Uuid>,
) -> Result<String> {
    if !matches!(
        message.chat.type_field,
        ChatType::Group | ChatType::Supergroup
    ) {
        return Ok("/bind can only be used in a Telegram group.".to_string());
    }
    if message.chat.is_forum != Some(true) {
        return Ok(
            "Topics are not enabled in this group. Enable Topics in the group settings, then try /bind again."
                .to_string(),
        );
    }

    let admins = match telegram_administrators(bridge, message.chat.id).await {
        Ok(admins) => admins,
        Err(error) => {
            warn!(error = %error, group = message.chat.id, "failed to check Telegram bot permissions");
            return Ok(
                "I couldn't check my permissions in this group. Make sure I am still a member, then try again."
                    .to_string(),
            );
        }
    };
    match find_administrator(&admins, bridge.tg_user_id) {
        Some(ChatMember::Creator(_)) => {}
        Some(ChatMember::Administrator(administrator))
            if administrator.can_manage_topics == Some(true) => {}
        Some(ChatMember::Administrator(_)) => {
            return Ok(
                "I am an administrator, but I do not have the “Manage Topics” permission. Grant it and try /bind again."
                    .to_string(),
            );
        }
        _ => {
            return Ok(
                "I need to be a group administrator with the “Manage Topics” permission before this group can be bound."
                    .to_string(),
            );
        }
    }

    let Some(user) = message.from.as_ref() else {
        return Ok("You must be a group administrator to use /bind.".to_string());
    };
    if find_administrator(&admins, user.id).is_none() {
        return Ok("You must be a group administrator to use /bind.".to_string());
    }
    if let Some(existing) = bridge.store.binding_for_space(space_id).await?
        && existing.tg_chat_id != message.chat.id
    {
        return Ok(format!(
            "Boluo space {space_id} is already bound to another Telegram group. Run /unbind in that group first."
        ));
    }

    // The bridge posts into the space as its own account, so it must be a
    // member. Public spaces join with no token; private ones need the invite
    // token from a /bind invite link (or an invite link DM'd to the bot first).
    let space = match bridge.boluo.lookup_space(space_id).await {
        Ok(SpaceLookup::Found(space)) => match ensure_member(bridge, space_id, token).await {
            Ok(()) => space,
            Err(JoinError::Failed(error)) => {
                warn!(error = %error, %space_id, "failed to auto-join Boluo space while binding");
                return Ok(format!(
                    "I'm not a member of Boluo space “{}” and couldn't join it. If it's private, send me an invite link: /bind <invite link>.",
                    space.name
                ));
            }
            Err(JoinError::MembershipCheck(error)) => {
                warn!(error = %error, %space_id, "failed to check Boluo space membership while binding");
                return Ok(format!(
                    "I couldn't check my membership in Boluo space {space_id}. Please try again."
                ));
            }
        },
        Ok(SpaceLookup::NotFound) => {
            return Ok(format!("Boluo space {space_id} does not exist."));
        }
        Ok(SpaceLookup::NoPermission) => {
            let Some(token) = token else {
                return Ok(format!(
                    "Boluo space {space_id} is private and I'm not a member. Send me an invite link: /bind <invite link>."
                ));
            };
            match bridge.boluo.join_space(space_id, Some(token)).await {
                Ok(space) => {
                    info!(%space_id, "joined private Boluo space via invite link while binding");
                    space
                }
                Err(error) => {
                    warn!(error = %error, %space_id, "failed to join private Boluo space via invite link");
                    return Ok(format!(
                        "I couldn't join Boluo space {space_id}. The invite link may be invalid or expired."
                    ));
                }
            }
        }
        Err(error) => {
            warn!(error = %error, %space_id, "failed to access Boluo space while binding");
            return Ok(format!(
                "I can't access Boluo space {space_id}. Check the space ID and the configured Boluo account's access."
            ));
        }
    };

    let binding = bridge.store.bind(message.chat.id, space_id).await?;
    start_binding_worker(bridge, binding).await;
    info!(group = binding.tg_chat_id, %space_id, "bound Telegram group to Boluo space");
    Ok(format!(
        "Bound this group to Boluo space “{}” ({space_id}).",
        space.name
    ))
}

async fn unbind_group(
    bridge: &Arc<Bridge>,
    message: &frankenstein::types::Message,
) -> Result<String> {
    if !matches!(
        message.chat.type_field,
        ChatType::Group | ChatType::Supergroup
    ) {
        return Ok("/unbind can only be used in a Telegram group.".to_string());
    }
    let Some(user) = message.from.as_ref() else {
        return Ok("You must be a group administrator to use /unbind.".to_string());
    };
    let admins = match telegram_administrators(bridge, message.chat.id).await {
        Ok(admins) => admins,
        Err(error) => {
            warn!(error = %error, group = message.chat.id, "failed to check Telegram user permissions for unbind");
            return Ok(
                "I couldn't verify your administrator permissions. Please try again.".to_string(),
            );
        }
    };
    if find_administrator(&admins, user.id).is_none() {
        return Ok("You must be a group administrator to use /unbind.".to_string());
    }

    let Some(binding) = bridge.store.unbind(message.chat.id).await? else {
        return Ok("This group is not bound to a Boluo space.".to_string());
    };
    stop_binding_worker(bridge, message.chat.id).await;
    info!(group = binding.tg_chat_id, space_id = %binding.space_id, "unbound Telegram group");
    Ok(format!(
        "Unbound this group from Boluo space {}.",
        binding.space_id
    ))
}

pub async fn send_notice(
    bridge: &Bridge,
    tg_chat_id: i64,
    message_thread_id: Option<i32>,
    text: String,
) -> Result<()> {
    let params = SendMessageParams::builder().chat_id(tg_chat_id).text(text);
    let params = match message_thread_id {
        Some(thread_id) => params.message_thread_id(thread_id).build(),
        None => params.build(),
    };
    bridge
        .tg
        .send_message(&params)
        .await
        .context("failed to send Telegram notice")?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn whisper_notice_does_not_include_message_text() {
        let (body, entities) = telegram_text("探索者🐙", "the secret", true).unwrap();

        assert_eq!(body, "探索者🐙 is whispering…");
        assert!(!body.contains("the secret"));
        let entities = entities.unwrap();
        assert_eq!(entities.len(), 1);
        assert_eq!(entities[0].type_field, MessageEntityType::Italic);
        assert_eq!(entities[0].offset, 0);
        assert_eq!(usize::from(entities[0].length), body.encode_utf16().count());
    }

    #[test]
    fn public_message_includes_its_text() {
        let (body, entities) = telegram_text("Alice", "hello", false).unwrap();

        assert_eq!(body, "Alice: hello");
        assert!(entities.is_none());
    }

    #[test]
    fn long_public_message_is_truncated_with_a_hint() {
        let secret_tail = "must not survive";
        let text = format!("{}🐙{secret_tail}", "a".repeat(TELEGRAM_TEXT_LIMIT));
        let (body, entities) = telegram_text("Alice", &text, false).unwrap();

        assert_eq!(body.encode_utf16().count(), TELEGRAM_TEXT_LIMIT);
        assert!(body.ends_with(TRUNCATION_HINT));
        assert!(!body.contains(secret_tail));
        assert!(entities.is_none());
    }

    #[test]
    fn only_supported_images_go_out_as_photos() {
        assert!(is_photo_mime("image/jpeg"));
        assert!(is_photo_mime("image/png"));
        assert!(!is_photo_mime("image/gif"));
        assert!(!is_photo_mime("image/webp"));
        assert!(!is_photo_mime("application/pdf"));
    }

    #[test]
    fn staged_media_file_name_uses_the_mime_extension() {
        let media_id = Uuid::nil();
        assert_eq!(
            media_file_name(media_id, "image/png"),
            format!("{media_id}.png")
        );
        assert_eq!(
            media_file_name(media_id, "application/pdf; charset=binary"),
            format!("{media_id}.pdf")
        );
        assert_eq!(
            media_file_name(media_id, "application/x-thing"),
            media_id.to_string()
        );
    }

    #[test]
    fn telegram_file_name_falls_back_when_path_is_bare() {
        assert_eq!(file_name_from_path("photos/file_42.jpg"), "file_42.jpg");
        assert_eq!(file_name_from_path("file_42.jpg"), "file_42.jpg");
        assert_eq!(file_name_from_path(""), "file");
        assert_eq!(file_name_from_path("trailing/"), "file");
    }

    #[test]
    fn parses_bind_command() {
        let space_id = Uuid::new_v4();

        assert_eq!(
            parse_bind_command(&format!("/bind@boluo_bot {space_id}")),
            Some(Ok((space_id, None)))
        );
        assert!(parse_bind_command("hello").is_none());
        assert!(matches!(parse_bind_command("/bind"), Some(Err(_))));
        assert!(matches!(
            parse_bind_command("/bind not-a-uuid"),
            Some(Err(_))
        ));
        assert!(matches!(
            parse_bind_command(&format!("/bind {space_id} extra")),
            Some(Err(_))
        ));
    }

    #[test]
    fn bind_command_accepts_space_links() {
        let space_id: Uuid = "acd47c82-84c6-11f1-9f6e-bffa4187e218".parse().unwrap();

        // A simple space route: no token.
        assert_eq!(
            parse_bind_command(&format!("/bind https://app.boluo.chat/#route={space_id}")),
            Some(Ok((space_id, None)))
        );
        // A space route with panes carrying a channel ID that must not be picked.
        assert_eq!(
            parse_bind_command(
                "/bind https://app.boluo.chat/#route=acd47c82-84c6-11f1-9f6e-bffa4187e218&panes=%5B%7B%22type%22%3A%22CHANNEL%22%2C%22channelId%22%3A%22acd59fe0-84c6-11f1-9f6e-83327406b3cb%22%2C%22key%22%3A0%7D%5D"
            ),
            Some(Ok((space_id, None)))
        );
    }

    #[test]
    fn bind_command_accepts_invite_links_with_token() {
        let space_id = Uuid::new_v4();
        let token = Uuid::new_v4();

        assert_eq!(
            parse_bind_command(&format!(
                "/bind https://boluo.chat/space/invite/{space_id}/{token}"
            )),
            Some(Ok((space_id, Some(token))))
        );
        assert_eq!(
            parse_bind_command(&format!(
                "/bind https://app.boluo.chat/en#route=invite?spaceId={space_id}&token={token}"
            )),
            Some(Ok((space_id, Some(token))))
        );
    }

    #[test]
    fn parses_site_invite_link() {
        let space_id = Uuid::new_v4();
        let token = Uuid::new_v4();
        let link = format!("https://boluo.chat/space/invite/{space_id}/{token}");

        assert_eq!(parse_invite_link(&link), Some((space_id, token)));
        assert_eq!(
            parse_invite_link(&format!("please join {link} thanks")),
            Some((space_id, token))
        );
    }

    #[test]
    fn parses_app_invite_link() {
        let space_id = Uuid::new_v4();
        let token = Uuid::new_v4();
        let link =
            format!("https://app.boluo.chat/en#route=invite?spaceId={space_id}&token={token}");

        assert_eq!(parse_invite_link(&link), Some((space_id, token)));
    }

    #[test]
    fn rejects_non_invite_text() {
        assert_eq!(parse_invite_link("hello there"), None);
        assert_eq!(
            parse_invite_link("https://boluo.chat/space/invite/not-a-uuid/also-bad"),
            None
        );
        assert_eq!(
            parse_invite_link("https://app.boluo.chat/#route=invite?spaceId=abc"),
            None
        );
    }

    #[test]
    fn parses_unbind_command() {
        assert_eq!(parse_unbind_command("/unbind"), Some(Ok(())));
        assert_eq!(parse_unbind_command("/unbind@boluo_bot"), Some(Ok(())));
        assert!(parse_unbind_command("hello").is_none());
        assert!(matches!(
            parse_unbind_command("/unbind extra"),
            Some(Err(_))
        ));
    }
}
