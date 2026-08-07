use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use unicode_normalization::UnicodeNormalization;
use uuid::Uuid;

use crate::error::ModelError;
use crate::spaces::SpaceAccess;

#[derive(
    Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, specta::Type, sqlx::Type,
)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(type_name = "asset_policy", rename_all = "PascalCase")]
pub enum AssetPolicy {
    #[default]
    Unlisted,
    Listed,
}

impl AssetPolicy {
    pub fn is_listed(self) -> bool {
        self == Self::Listed
    }

    pub fn can_edit(self, creator_id: Option<Uuid>, user_id: Uuid, access: SpaceAccess) -> bool {
        if creator_id == Some(user_id) {
            return true;
        }
        match self {
            Self::Unlisted => false,
            Self::Listed => access.can_manage(),
        }
    }

    pub fn can_delete(self, creator_id: Option<Uuid>, user_id: Uuid, access: SpaceAccess) -> bool {
        creator_id == Some(user_id) || (self.is_listed() && access.can_manage())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, specta::Type, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Asset {
    pub id: Uuid,
    pub space_id: Uuid,
    pub media_id: Uuid,
    pub creator_id: Option<Uuid>,
    pub name: String,
    pub policy: AssetPolicy,
    pub mime_type: String,
    pub created: DateTime<Utc>,
}

impl Asset {
    pub async fn create(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        space_id: Uuid,
        media_id: Uuid,
        creator_id: Uuid,
        name: &str,
        policy: AssetPolicy,
    ) -> Result<Asset, ModelError> {
        let name = name.trim().nfc().collect::<String>();
        crate::validators::ASSET_NAME.run(&name)?;
        sqlx::query_file_as!(
            Asset,
            "sql/assets/create.sql",
            Uuid::now_v7(),
            space_id,
            media_id,
            creator_id,
            name,
            policy as AssetPolicy,
        )
        .fetch_one(&mut **db)
        .await
        .map_err(Into::into)
    }

    pub async fn get_by_id_for_update(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        asset_id: Uuid,
    ) -> Result<Option<Asset>, sqlx::Error> {
        sqlx::query_file_as!(Asset, "sql/assets/get_by_id_for_update.sql", asset_id)
            .fetch_optional(&mut **db)
            .await
    }

    pub async fn get_by_id_in_space<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
        asset_id: Uuid,
    ) -> Result<Option<Asset>, sqlx::Error> {
        sqlx::query_file_as!(Asset, "sql/assets/get_by_id.sql", space_id, asset_id)
            .fetch_optional(db)
            .await
    }

    pub async fn list_by_space<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
    ) -> Result<Vec<Asset>, sqlx::Error> {
        sqlx::query_file_as!(Asset, "sql/assets/list_by_space.sql", space_id)
            .fetch_all(db)
            .await
    }

    pub async fn list_by_creator<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        creator_id: Uuid,
    ) -> Result<Vec<Asset>, sqlx::Error> {
        sqlx::query_file_as!(Asset, "sql/assets/list_by_creator.sql", creator_id)
            .fetch_all(db)
            .await
    }

    pub async fn update(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        asset_id: Uuid,
        name: &str,
        policy: AssetPolicy,
    ) -> Result<Asset, ModelError> {
        let name = name.trim().nfc().collect::<String>();
        crate::validators::ASSET_NAME.run(&name)?;
        sqlx::query_file_as!(
            Asset,
            "sql/assets/update.sql",
            asset_id,
            name,
            policy as AssetPolicy,
        )
        .fetch_one(&mut **db)
        .await
        .map_err(Into::into)
    }

    pub async fn delete(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        asset_id: Uuid,
    ) -> Result<bool, ModelError> {
        let Some(space_id) =
            sqlx::query_scalar::<_, Uuid>("SELECT space_id FROM assets WHERE id = $1 FOR UPDATE")
                .bind(asset_id)
                .fetch_optional(&mut **db)
                .await?
        else {
            return Ok(false);
        };
        let is_entry_component = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM entry_components_asset WHERE space_id = $1 AND asset_id = $2)",
        )
        .bind(space_id)
        .bind(asset_id)
        .fetch_one(&mut **db)
        .await?;
        if is_entry_component {
            return Err(ModelError::Conflict(
                "Asset is used by an Entry Component".to_string(),
            ));
        }
        sqlx::query!("DELETE FROM assets WHERE id = $1", asset_id)
            .execute(&mut **db)
            .await?;
        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn asset_policy_separates_edit_and_delete_permissions() {
        let creator_id = Uuid::now_v7();
        let other_id = Uuid::now_v7();
        let member = SpaceAccess {
            can_access: true,
            is_member: true,
            is_admin: false,
            is_game_master: false,
            is_owner: false,
        };
        let admin = SpaceAccess {
            is_admin: true,
            ..member
        };

        assert!(AssetPolicy::Unlisted.can_edit(Some(creator_id), creator_id, member));
        assert!(AssetPolicy::Unlisted.can_delete(Some(creator_id), creator_id, member));
        assert!(!AssetPolicy::Unlisted.can_edit(Some(creator_id), other_id, admin));
        assert!(!AssetPolicy::Unlisted.can_delete(Some(creator_id), other_id, admin));
        assert!(AssetPolicy::Listed.can_edit(Some(creator_id), other_id, admin));
        assert!(AssetPolicy::Listed.can_delete(Some(creator_id), other_id, admin));
        assert!(!AssetPolicy::Listed.can_edit(Some(creator_id), other_id, member));
        assert!(!AssetPolicy::Listed.can_delete(Some(creator_id), other_id, member));
    }
}
