use compact_str::CompactString;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ComponentRef {
    pub scope_id: Uuid,
    pub entry_id: Option<Uuid>,
    #[specta(type = String)]
    pub key: CompactString,
    #[specta(type = String)]
    pub component_type: CompactString,
}

// Payload shared by live Components, history, and message entities.
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, specta::Type)]
#[serde(
    tag = "payloadType",
    rename_all = "SCREAMING_SNAKE_CASE",
    rename_all_fields = "camelCase"
)]
pub enum ComponentPayload {
    Json {
        schema_version: i32,
        data: serde_json::Value,
    },
    Asset {
        asset_id: Uuid,
    },
}

#[cfg(feature = "sqlx")]
impl sqlx::Type<sqlx::Postgres> for ComponentPayload {
    fn type_info() -> sqlx::postgres::PgTypeInfo {
        <sqlx::types::Json<Self> as sqlx::Type<sqlx::Postgres>>::type_info()
    }
}

#[cfg(feature = "sqlx")]
impl<'r> sqlx::Decode<'r, sqlx::Postgres> for ComponentPayload {
    fn decode(value: sqlx::postgres::PgValueRef<'r>) -> Result<Self, sqlx::error::BoxDynError> {
        <sqlx::types::Json<Self> as sqlx::Decode<'r, sqlx::Postgres>>::decode(value)
            .map(|json| json.0)
    }
}
