use serde::{Deserialize, Serialize};
use time::OffsetDateTime;
use uuid::Uuid;

use crate::spaces::AccessPolicy;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, specta::Type, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Scope {
    pub id: Uuid,
    pub space_id: Uuid,
    pub kind: ScopeKind,
    pub owner_id: Option<Uuid>,
    pub access_policy: AccessPolicy,
    pub access_channel_id: Option<Uuid>,
    pub version: Uuid,
    pub created: OffsetDateTime,
    pub modified: OffsetDateTime,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, specta::Type, sqlx::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(type_name = "scope_kind", rename_all = "PascalCase")]
pub enum ScopeKind {
    Space,
    Character,
}

impl Scope {
    pub async fn get_by_id<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        id: Uuid,
    ) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_file_as!(Scope, "sql/scopes/get.sql", id)
            .fetch_optional(db)
            .await
    }

    pub(crate) async fn list_by_space(
        db: &mut sqlx::PgConnection,
        space_id: Uuid,
    ) -> Result<Vec<Self>, sqlx::Error> {
        sqlx::query_file_as!(Scope, "sql/scopes/list_by_space.sql", space_id)
            .fetch_all(db)
            .await
    }

    pub fn can_view(
        &self,
        user_id: Option<Uuid>,
        context: crate::spaces::ResourceAccessContext,
    ) -> bool {
        self.access_policy.can_view(self.owner_id, user_id, context)
    }

    pub fn can_edit(&self, user_id: Uuid, context: crate::spaces::ResourceAccessContext) -> bool {
        self.access_policy.can_edit(self.owner_id, user_id, context)
    }
}
