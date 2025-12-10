use crate::channels::ChannelMember;
use crate::error::AppError;
use crate::error::Find;
use crate::events::Update;
use crate::messages::Entities;
use crate::utils::is_false;
use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(tag = "type")]
pub enum PreviewDiffOp {
    #[serde(rename = "SPLICE")]
    Splice {
        /// The start index for inserting
        i: u16,
        /// The length of the text to be replaced
        len: u16,
        /// The text to be inserted
        #[serde(rename = "_")]
        text: String,
    },
    #[serde(rename = "A")]
    Append {
        /// The text to be appended
        #[serde(rename = "_")]
        text: String,
    },
    #[serde(rename = "NAME")]
    ChangeName { name: String },
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
pub struct PreviewDiffPost {
    /// Channel ID
    #[serde(rename = "ch")]
    pub channel_id: Uuid,
    /// The id of the preview that is being edited
    pub id: Uuid,
    /// The version of the diff reference
    #[serde(rename = "ref")]
    pub reference_version: u16,
    /// The version of the diff
    ///
    /// Every edit will increase the version.
    #[serde(default, rename = "v")]
    pub version: u16,
    /// The operation of the diff
    pub op: PreviewDiffOp,
    /// Changed entities
    #[serde(default, rename = "~")]
    pub entities: Vec<(u16, shared_types::entities::Entity)>,
}

impl PreviewDiffPost {
    pub async fn broadcast(self, space_id: Uuid, user_id: Uuid) -> Result<(), AppError> {
        Update::preview_diff(
            space_id,
            PreviewDiff {
                sender: user_id,
                payload: self,
            },
        );
        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
pub struct PreviewDiff {
    pub sender: Uuid,
    #[serde(rename = "_")]
    pub payload: PreviewDiffPost,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Preview {
    pub id: Uuid,
    /// The version of the preview
    ///
    /// Every edit will increase the version.
    ///
    /// Start from 1.
    #[serde(default, rename = "v")]
    pub version: u16,
    pub sender_id: Uuid,
    pub channel_id: Uuid,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parent_message_id: Option<Uuid>,
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub media_id: Option<Uuid>,
    #[serde(default, skip_serializing_if = "is_false")]
    pub in_game: bool,
    #[serde(default, skip_serializing_if = "is_false")]
    pub is_action: bool,
    #[serde(default, skip_serializing_if = "is_false")]
    pub is_master: bool,
    #[serde(default, skip_serializing_if = "is_false")]
    pub clear: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub whisper_to_users: Option<Vec<Uuid>>,
    pub entities: Entities,
    pub pos: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub edit_for: Option<DateTime<Utc>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub edit: Option<PreviewEdit>,
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PreviewEdit {
    pub time: DateTime<Utc>,
    pub p: i32,
    pub q: i32,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct PreviewPost {
    pub id: Uuid,
    #[serde(default, rename = "v")]
    pub version: u16,
    pub channel_id: Uuid,
    pub name: String,
    pub media_id: Option<Uuid>,
    #[serde(default)]
    pub in_game: bool,
    #[serde(default)]
    pub is_action: bool,
    pub text: Option<String>,
    #[serde(default)]
    pub clear: bool,
    pub entities: Entities,
    #[serde(default)]
    pub edit_for: Option<DateTime<Utc>>,
    #[serde(default)]
    pub edit: Option<PreviewEdit>,
}

impl PreviewPost {
    pub async fn broadcast(
        self,
        pool: &sqlx::PgPool,
        space_id: Uuid,
        user_id: Uuid,
    ) -> Result<(), AppError> {
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
        } = self;
        let mut conn = pool.acquire().await?;
        let mut should_clear = false;
        if let Some(text) = text.as_ref() {
            if (text.trim().is_empty() || entities.0.is_empty()) && edit_for.is_none() {
                should_clear = true;
            }
        }
        let muted = text.is_none();
        let mut pos = 0.0;
        if let Some(PreviewEdit { p, q, time }) = edit {
            pos = p as f64 / q as f64;
            edit_for = Some(time);
        } else if edit_for.is_none() && !should_clear {
            use std::time::Duration;

            let timeout = if muted {
                Duration::from_secs(8)
            } else {
                Duration::from_secs(60 * 3)
            };
            let pos_ratio = crate::pos::CHANNEL_POS_MANAGER
                .preview_pos(channel_id, id, timeout)
                .await?;
            pos = (*pos_ratio.numer() as f64 / *pos_ratio.denom() as f64).ceil();
        }
        let is_master = ChannelMember::get(&mut *conn, user_id, space_id, channel_id)
            .await
            .or_no_permission()?
            .is_master;
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

        if should_clear {
            crate::pos::CHANNEL_POS_MANAGER.cancel(channel_id, id).await;
        }
        Update::message_preview(space_id, preview);
        Ok(())
    }
}
