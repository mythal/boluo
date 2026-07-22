use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::entities::Entity;

#[derive(Debug, Serialize, Deserialize, Clone, Default, specta::Type)]
pub struct Entities(pub Vec<Entity>);

#[cfg(feature = "sqlx")]
impl sqlx::Encode<'_, sqlx::Postgres> for Entities {
    fn encode_by_ref(
        &self,
        buf: &mut sqlx::postgres::PgArgumentBuffer,
    ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
        let json = serde_json::to_value(&self.0)?;
        <serde_json::Value as sqlx::Encode<sqlx::Postgres>>::encode_by_ref(&json, buf)
    }
}

#[cfg(feature = "sqlx")]
impl sqlx::Decode<'_, sqlx::Postgres> for Entities {
    fn decode(
        value: sqlx::postgres::PgValueRef<'_>,
    ) -> std::result::Result<Self, sqlx::error::BoxDynError> {
        let mut buf = value.as_bytes()?;

        if value.format() == sqlx::postgres::PgValueFormat::Binary {
            if buf[0] != 1 {
                tracing::error!("Invalid JSONB format");
                return Ok(Default::default());
            }
            buf = &buf[1..];
        }
        match serde_json::from_slice::<'_, Entities>(buf) {
            Ok(entities) => Ok(entities),
            // Fall back to the legacy on-disk shape.
            Err(_) => match serde_json::from_slice::<'_, Vec<crate::legacy::LegacyEntity>>(buf) {
                Ok(legacy_entities) => Ok(Entities(
                    legacy_entities.into_iter().map(Into::into).collect(),
                )),
                Err(err) => {
                    tracing::error!("Failed to decode JSONB: {}", err);
                    Ok(Default::default())
                }
            },
        }
    }
}

#[cfg(feature = "sqlx")]
impl sqlx::Type<sqlx::Postgres> for Entities {
    fn type_info() -> sqlx::postgres::PgTypeInfo {
        sqlx::postgres::PgTypeInfo::with_name("jsonb")
    }
}

#[derive(Deserialize, Serialize, Debug, Clone, Default, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct NewMessage {
    #[serde(default)]
    pub message_id: Option<Uuid>,
    #[serde(default)]
    pub preview_id: Option<Uuid>,
    pub channel_id: Uuid,
    #[serde(default)]
    pub space_id: Option<Uuid>,
    pub name: String,
    pub text: String,
    #[serde(default)]
    pub entities: Entities,
    pub in_game: bool,
    #[serde(default)]
    pub is_action: bool,
    #[serde(default)]
    pub media_id: Option<Uuid>,
    #[serde(default)]
    pub whisper_to_users: Option<Vec<Uuid>>,
    #[serde(default)]
    pub pos: Option<(i32, i32)>,
    #[serde(default)]
    pub color: String,
}
