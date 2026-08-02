use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use unicode_normalization::UnicodeNormalization;
use uuid::Uuid;

use crate::error::{ModelError, ValidationFailed};
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
    ) -> Result<bool, sqlx::Error> {
        Ok(sqlx::query!("DELETE FROM assets WHERE id = $1", asset_id)
            .execute(&mut **db)
            .await?
            .rows_affected()
            == 1)
    }
}

pub(crate) fn validate_asset_ids(asset_ids: &[Uuid]) -> Result<(), ValidationFailed> {
    const MAX_ASSETS_PER_CHARACTER: usize = 64;
    if asset_ids.len() > MAX_ASSETS_PER_CHARACTER {
        return Err(ValidationFailed("Too many Character Assets (max 64)."));
    }
    let unique = asset_ids.iter().collect::<std::collections::HashSet<_>>();
    if unique.len() != asset_ids.len() {
        return Err(ValidationFailed(
            "Character Assets must not contain duplicates.",
        ));
    }
    Ok(())
}

pub(crate) async fn replace_character_assets(
    db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    space_id: Uuid,
    character_id: Uuid,
    asset_ids: &[Uuid],
) -> Result<(), ModelError> {
    validate_asset_ids(asset_ids)?;
    sqlx::query!(
        "DELETE FROM character_assets WHERE character_id = $1",
        character_id
    )
    .execute(&mut **db)
    .await?;
    if asset_ids.is_empty() {
        return Ok(());
    }
    let inserted = sqlx::query_file!(
        "sql/assets/attach_to_character.sql",
        space_id,
        character_id,
        asset_ids,
    )
    .execute(&mut **db)
    .await?
    .rows_affected();
    if inserted != asset_ids.len() as u64 {
        return Err(
            ValidationFailed("Every Character Asset must belong to the same Space.").into(),
        );
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::characters::Character;
    use crate::media::models::Media;
    use crate::spaces::{AccessPolicy, Space};
    use crate::users::User;

    async fn create_user(pool: &sqlx::PgPool) -> User {
        let suffix = Uuid::new_v4().simple().to_string();
        User::register(
            pool,
            &format!("asset_{suffix}@example.com"),
            &format!("asset_{}", &suffix[..8]),
            "Asset Tester",
            "AssetPass123!",
        )
        .await
        .expect("failed to create Asset test user")
    }

    async fn create_media(pool: &sqlx::PgPool, user_id: Uuid, suffix: &str) -> Media {
        Media::create(
            pool,
            &Uuid::now_v7(),
            "image/webp",
            user_id,
            &format!("{suffix}.webp"),
            &format!("{suffix}.webp"),
            suffix.to_string(),
            1024,
            "test",
        )
        .await
        .expect("failed to create Media")
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_assets_and_ordered_character_references(pool: sqlx::PgPool) {
        let user = create_user(&pool).await;
        let space = Space::create(
            &pool,
            format!("asset_space_{}", &Uuid::new_v4().simple().to_string()[..8]),
            &user.id,
            "Asset test".to_string(),
            None,
            Some("d20"),
        )
        .await
        .expect("failed to create Space");
        let media_one = create_media(&pool, user.id, "neutral").await;
        let media_two = create_media(&pool, user.id, "happy").await;
        let mut transaction = pool
            .begin()
            .await
            .expect("failed to begin Asset transaction");
        let neutral = Asset::create(
            &mut transaction,
            space.id,
            media_one.id,
            user.id,
            " Neutral ",
            AssetPolicy::Unlisted,
        )
        .await
        .expect("failed to create neutral Asset");
        let happy = Asset::create(
            &mut transaction,
            space.id,
            media_two.id,
            user.id,
            "Happy",
            AssetPolicy::Listed,
        )
        .await
        .expect("failed to create happy Asset");
        let character = Character::create(
            &mut transaction,
            space.id,
            user.id,
            "Asset Character",
            "asset_character",
            Vec::new(),
            "",
            "",
            AccessPolicy::Personal,
            None,
            Vec::new(),
            vec![happy.id, neutral.id],
        )
        .await
        .expect("failed to create Character with Assets");
        transaction.commit().await.expect("failed to commit Assets");

        assert_eq!(neutral.name, "Neutral");
        assert_eq!(neutral.policy, AssetPolicy::Unlisted);
        assert_eq!(neutral.mime_type, "image/webp");
        assert_eq!(character.asset_ids, vec![happy.id, neutral.id]);
        assert_eq!(
            Asset::list_by_space(&pool, space.id)
                .await
                .expect("failed to list Assets")
                .len(),
            1
        );
        assert_eq!(
            Asset::list_by_creator(&pool, user.id)
                .await
                .expect("failed to list creator Assets")
                .len(),
            2
        );
        assert_eq!(
            Asset::get_by_id_in_space(&pool, space.id, neutral.id)
                .await
                .expect("failed to query Asset")
                .expect("Asset missing")
                .media_id,
            media_one.id
        );

        let mut transaction = pool.begin().await.expect("failed to begin Asset update");
        let updated = Asset::update(
            &mut transaction,
            neutral.id,
            " Updated neutral ",
            AssetPolicy::Listed,
        )
        .await
        .expect("failed to update Asset");
        transaction
            .commit()
            .await
            .expect("failed to commit Asset update");
        assert_eq!(updated.name, "Updated neutral");
        assert_eq!(updated.policy, AssetPolicy::Listed);
        assert_eq!(
            Asset::list_by_space(&pool, space.id)
                .await
                .expect("failed to list updated Assets")
                .len(),
            2
        );

        let mut transaction = pool.begin().await.expect("failed to begin Asset delete");
        assert!(
            Asset::delete(&mut transaction, neutral.id)
                .await
                .expect("failed to delete Asset")
        );
        transaction
            .commit()
            .await
            .expect("failed to commit Asset delete");
        assert!(
            Asset::get_by_id_in_space(&pool, space.id, neutral.id)
                .await
                .expect("failed to query deleted Asset")
                .is_none()
        );
        assert_eq!(
            Character::get_by_id(&pool, &character.id)
                .await
                .expect("failed to reload Character")
                .expect("Character missing")
                .asset_ids,
            vec![happy.id]
        );
    }

    #[test]
    fn character_asset_ids_are_bounded_and_unique() {
        let id = Uuid::now_v7();
        assert!(validate_asset_ids(&[id]).is_ok());
        assert!(validate_asset_ids(&[id, id]).is_err());
        assert!(validate_asset_ids(&vec![Uuid::nil(); 65]).is_err());
    }

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
