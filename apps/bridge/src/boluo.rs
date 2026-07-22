//! Boluo HTTP + WebSocket client. Auth is a bearer token for a real Boluo user;
//! the server has no bot-token concept.

use anyhow::{Context, Result, anyhow};
use generated::{
    Channel, ChannelWithMaybeMember, LoginReturn, Message, Space, SpaceMember, SpaceWithMember,
    User,
};
use reqwest::header::CONTENT_TYPE;
use serde::{Deserialize, Serialize};
use serde_json::json;
use shared_types::entities::{Entity, Span};
use shared_types::events::Token;
use shared_types::messages::{Entities, NewMessage};
use uuid::Uuid;

use crate::store::EventCursor;

pub use generated::{Update, UpdateBody};

/// Every REST response is wrapped as `{ isOk, ok, err }`.
#[derive(Deserialize)]
struct WebResult<T> {
    #[serde(rename = "isOk")]
    is_ok: bool,
    ok: Option<T>,
    err: Option<WebError>,
}

#[derive(Debug, Deserialize)]
struct WebError {
    code: String,
    message: String,
}

pub enum SpaceLookup {
    Found(Space),
    NotFound,
    NoPermission,
}

#[derive(Deserialize)]
struct UploadedMedia {
    id: Uuid,
}

/// Body for `POST /api/messages/edit`; omitted fields default on the server.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EditMessage<'a> {
    message_id: Uuid,
    name: &'a str,
    text: &'a str,
    entities: Entities,
    media_id: Option<Uuid>,
}

pub struct MediaFile {
    pub bytes: Vec<u8>,
    pub mime: Option<String>,
}

impl<T> WebResult<T> {
    fn into_result(self) -> Result<T> {
        if self.is_ok {
            self.ok
                .ok_or_else(|| anyhow!("response marked ok but had no payload"))
        } else {
            match self.err {
                Some(error) => Err(anyhow!("boluo error {}: {}", error.code, error.message)),
                None => Err(anyhow!("Boluo response marked as failed without an error")),
            }
        }
    }
}

pub struct Boluo {
    http: reqwest::Client,
    base_url: String,
    token: String,
    user_id: Uuid,
}

impl Boluo {
    pub async fn with_token(base_url: String, token: String) -> Result<Self> {
        let mut boluo = Boluo {
            http: reqwest::Client::new(),
            base_url,
            token,
            user_id: Uuid::nil(),
        };
        boluo.user_id = boluo
            .query_self()
            .await?
            .ok_or_else(|| anyhow!("Boluo session token is not authenticated"))?
            .id;
        Ok(boluo)
    }

    pub async fn login(base_url: String, username: &str, password: &str) -> Result<Self> {
        let http = reqwest::Client::new();
        let url = format!("{base_url}/api/users/login");
        let resp: WebResult<LoginReturn> = http
            .post(&url)
            .json(&json!({
                "username": username,
                "password": password,
                "withToken": true,
            }))
            .send()
            .await
            .context("login request failed")?
            .json()
            .await
            .context("failed to decode login response")?;
        let login = resp.into_result()?;
        let user_id = login.me.user.id;
        let token = login
            .token
            .ok_or_else(|| anyhow!("login succeeded but returned no token"))?;
        Ok(Boluo {
            http,
            base_url,
            token,
            user_id,
        })
    }

    pub fn user_id(&self) -> Uuid {
        self.user_id
    }

    fn auth(&self, req: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
        req.header("Authorization", format!("Bearer {}", self.token))
    }

    pub async fn channels_by_space(&self, space_id: Uuid) -> Result<Vec<Channel>> {
        let url = format!("{}/api/channels/by_space?id={space_id}", self.base_url);
        let resp: WebResult<Vec<ChannelWithMaybeMember>> = self
            .auth(self.http.get(&url))
            .send()
            .await
            .context("channels_by_space request failed")?
            .json()
            .await
            .context("failed to decode channels_by_space response")?;
        Ok(resp.into_result()?.into_iter().map(|c| c.channel).collect())
    }

    pub async fn lookup_space(&self, space_id: Uuid) -> Result<SpaceLookup> {
        let url = format!("{}/api/spaces/query?id={space_id}", self.base_url);
        let resp: WebResult<Space> = self
            .auth(self.http.get(&url))
            .send()
            .await
            .context("space query request failed")?
            .json()
            .await
            .context("failed to decode space query response")?;
        if resp.is_ok {
            return resp
                .ok
                .map(SpaceLookup::Found)
                .ok_or_else(|| anyhow!("space response marked ok but had no payload"));
        }
        match resp.err.as_ref().map(|error| error.code.as_str()) {
            Some("NOT_FOUND") => Ok(SpaceLookup::NotFound),
            Some("NO_PERMISSION") => Ok(SpaceLookup::NoPermission),
            _ => match resp.into_result() {
                Err(error) => Err(error),
                Ok(_) => unreachable!("failed response cannot contain a successful space"),
            },
        }
    }

    /// Reports whether the authenticated account is a member of the space.
    pub async fn is_member(&self, space_id: Uuid) -> Result<bool> {
        let url = format!("{}/api/spaces/my_space_member?id={space_id}", self.base_url);
        let resp: WebResult<Option<SpaceMember>> = self
            .auth(self.http.get(&url))
            .send()
            .await
            .context("my_space_member request failed")?
            .json()
            .await
            .context("failed to decode my_space_member response")?;
        Ok(resp.into_result()?.is_some())
    }

    /// Joins a space so the account becomes a member. Public spaces need no
    /// `token`; private ones require the invite token carried by an invite link.
    pub async fn join_space(&self, space_id: Uuid, token: Option<Uuid>) -> Result<Space> {
        let mut url = format!("{}/api/spaces/join?spaceId={space_id}", self.base_url);
        if let Some(token) = token {
            use std::fmt::Write as _;
            write!(url, "&token={token}").expect("writing to a String cannot fail");
        }
        let resp: WebResult<SpaceWithMember> = self
            .auth(self.http.post(&url))
            .send()
            .await
            .context("join_space request failed")?
            .json()
            .await
            .context("failed to decode join_space response")?;
        Ok(resp.into_result()?.space)
    }

    /// Uploads a file (raw bytes as the body, metadata as query params) and
    /// returns the new media id.
    pub async fn upload_media(&self, filename: &str, mime: &str, bytes: Vec<u8>) -> Result<Uuid> {
        let size = bytes.len().to_string();
        let url = reqwest::Url::parse_with_params(
            &format!("{}/api/media/upload", self.base_url),
            &[("filename", filename), ("mimeType", mime), ("size", &size)],
        )
        .context("failed to build media upload URL")?;
        let resp: WebResult<UploadedMedia> = self
            .auth(self.http.post(url))
            .body(bytes)
            .send()
            .await
            .context("media upload request failed")?
            .json()
            .await
            .context("failed to decode media upload response")?;
        Ok(resp.into_result()?.id)
    }

    /// Downloads a media file by id. Unauthenticated: media URLs are public,
    /// and this follows the redirect to public storage.
    pub async fn download_media(&self, media_id: Uuid) -> Result<MediaFile> {
        let url = format!("{}/api/media/get?id={media_id}", self.base_url);
        let resp = self
            .http
            .get(&url)
            .send()
            .await
            .context("media download request failed")?
            .error_for_status()
            .context("media download returned an error status")?;
        let mime = resp
            .headers()
            .get(CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .map(|value| value.to_string());
        let bytes = resp
            .bytes()
            .await
            .context("failed to read media bytes")?
            .to_vec();
        Ok(MediaFile { bytes, mime })
    }

    async fn query_self(&self) -> Result<Option<User>> {
        let url = format!("{}/api/users/query_self", self.base_url);
        let resp: WebResult<Option<User>> = self
            .auth(self.http.get(&url))
            .send()
            .await
            .context("query_self request failed")?
            .json()
            .await
            .context("failed to decode query_self response")?;
        resp.into_result()
    }

    pub async fn events_token(&self) -> Result<Uuid> {
        let url = format!("{}/api/events/token", self.base_url);
        let resp: WebResult<Token> = self
            .auth(self.http.get(&url))
            .send()
            .await
            .context("events_token request failed")?
            .json()
            .await
            .context("failed to decode events_token response")?;
        Ok(resp.into_result()?.token)
    }

    pub async fn send_message(&self, msg: &NewMessage) -> Result<Uuid> {
        let url = format!("{}/api/messages/send", self.base_url);
        let resp: WebResult<Message> = self
            .auth(self.http.post(&url))
            .json(msg)
            .send()
            .await
            .context("send_message request failed")?
            .json()
            .await
            .context("failed to decode send_message response")?;
        Ok(resp.into_result()?.id)
    }

    /// The bridge only edits messages it sent, so the server's sender check passes.
    pub async fn edit_message(
        &self,
        message_id: Uuid,
        name: &str,
        text: &str,
        media_id: Option<Uuid>,
    ) -> Result<()> {
        let url = format!("{}/api/messages/edit", self.base_url);
        let payload = EditMessage {
            message_id,
            name,
            text,
            entities: text_entities(text),
            media_id,
        };
        let resp: WebResult<Message> = self
            .auth(self.http.post(&url))
            .json(&payload)
            .send()
            .await
            .context("edit_message request failed")?
            .json()
            .await
            .context("failed to decode edit_message response")?;
        resp.into_result().map(|_| ())
    }

    pub fn connect_url(&self, space_id: Uuid, token: Uuid, cursor: Option<EventCursor>) -> String {
        let ws_base = self
            .base_url
            .replacen("https://", "wss://", 1)
            .replacen("http://", "ws://", 1);
        let mut url = format!("{ws_base}/api/events/connect?mailbox={space_id}&token={token}");
        if let Some(cursor) = cursor {
            use std::fmt::Write as _;
            write!(
                url,
                "&after={}&node={}&seq={}",
                cursor.timestamp, cursor.node, cursor.seq
            )
            .expect("writing to a String cannot fail");
        }
        url
    }
}

/// A plain-text send-message request. The server rejects empty text, so the
/// caller must pass non-empty text.
pub fn plain_message(
    channel_id: Uuid,
    name: String,
    text: String,
    media_id: Option<Uuid>,
) -> NewMessage {
    let entities = text_entities(&text);
    NewMessage {
        channel_id,
        name,
        entities,
        text,
        media_id,
        ..Default::default()
    }
}

/// Like [`plain_message`], but linked to a compose preview so the server clears
/// that preview when the message lands.
pub fn plain_message_with_preview(
    channel_id: Uuid,
    name: String,
    text: String,
    preview_id: Uuid,
) -> NewMessage {
    NewMessage {
        preview_id: Some(preview_id),
        ..plain_message(channel_id, name, text, None)
    }
}

/// Builds a `PREVIEW` client-event frame for the Boluo WebSocket, as a web
/// client sends while composing. A cleared frame (empty text, no entities) tells
/// the server to cancel the preview.
pub fn preview_frame(
    channel_id: Uuid,
    id: Uuid,
    version: u16,
    name: &str,
    text: Option<&str>,
    clear: bool,
) -> String {
    let (text_value, entities) = if clear {
        (json!(""), json!([]))
    } else {
        let entities = text
            .map(|text| serde_json::to_value(text_entities(text)).unwrap_or_else(|_| json!([])))
            .unwrap_or_else(|| json!([]));
        (json!(text), entities)
    };
    json!({
        "type": "PREVIEW",
        "preview": {
            "id": id,
            "v": version,
            "channelId": channel_id,
            "name": name,
            "mediaId": null,
            "inGame": false,
            "isAction": false,
            "text": text_value,
            "clear": clear,
            "entities": entities,
            "editFor": null,
            "edit": null,
        }
    })
    .to_string()
}

/// A single Text span over the whole message; the server rejects empty entities.
fn text_entities(text: &str) -> Entities {
    let len = text.chars().count() as i32;
    Entities(vec![Entity::Text(Span { start: 0, len })])
}

#[cfg(test)]
mod tests {
    use super::*;
    use shared_types::preview::PreviewPost;

    #[test]
    fn preview_frame_matches_the_server_client_event() {
        let channel_id = Uuid::new_v4();
        let id = Uuid::new_v4();
        let frame = preview_frame(channel_id, id, 3, "Alice", Some("hi"), false);
        let value: serde_json::Value = serde_json::from_str(&frame).unwrap();

        assert_eq!(value["type"], "PREVIEW");
        // The payload must deserialize into the shape the server accepts.
        let post: PreviewPost = serde_json::from_value(value["preview"].clone()).unwrap();
        assert_eq!(post.id, id);
        assert_eq!(post.channel_id, channel_id);
        assert_eq!(post.version, 3);
        assert_eq!(post.name, "Alice");
        assert_eq!(post.text.as_deref(), Some("hi"));
        assert!(!post.clear);
        assert_eq!(post.entities.0.len(), 1);
    }

    #[test]
    fn cleared_preview_frame_cancels_the_compose_preview() {
        let frame = preview_frame(Uuid::new_v4(), Uuid::new_v4(), 4, "Alice", None, true);
        let value: serde_json::Value = serde_json::from_str(&frame).unwrap();
        let post: PreviewPost = serde_json::from_value(value["preview"].clone()).unwrap();

        assert!(post.clear);
        assert_eq!(post.text.as_deref(), Some(""));
        assert!(post.entities.0.is_empty());
    }

    #[test]
    fn plain_message_with_preview_links_the_preview_id() {
        let channel_id = Uuid::new_v4();
        let preview_id = Uuid::new_v4();
        let msg = plain_message_with_preview(
            channel_id,
            "Alice".to_string(),
            "hi".to_string(),
            preview_id,
        );

        assert_eq!(msg.preview_id, Some(preview_id));
        assert_eq!(msg.channel_id, channel_id);
        assert_eq!(msg.text, "hi");
        assert!(msg.media_id.is_none());
    }
}
