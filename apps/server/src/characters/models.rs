use chrono::prelude::*;
use compact_str::CompactString;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use unicode_normalization::UnicodeNormalization;
use uuid::Uuid;

use crate::error::{ModelError, ValidationFailed};
use crate::spaces::{AccessPolicy, ResourceAccessContext, validate_access_channel};

const IDENTIFIER_ALIAS_MAX_COUNT: usize = 16;

pub(crate) fn normalize_ident(value: &str) -> Result<String, ValidationFailed> {
    let key = value
        .trim()
        .replace(char::is_whitespace, "_")
        .nfc()
        .collect::<String>();
    crate::validators::IDENT.run(&key)?;
    Ok(key)
}

pub(crate) fn normalize_aliases(
    values: Vec<String>,
    primary: Option<&str>,
) -> Result<Vec<String>, ValidationFailed> {
    let mut seen = HashSet::new();
    if let Some(primary) = primary {
        seen.insert(primary.to_lowercase());
    }
    let mut normalized = Vec::new();
    for value in values {
        if value.trim().is_empty() {
            continue;
        }
        let value = normalize_ident(&value)?;
        if seen.insert(value.to_lowercase()) {
            normalized.push(value);
            if normalized.len() > IDENTIFIER_ALIAS_MAX_COUNT {
                return Err(ValidationFailed("Too many aliases (max 16)."));
            }
        }
    }
    Ok(normalized)
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, specta::Type, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Character {
    pub id: Uuid,
    #[specta(type = String)]
    pub name: CompactString,
    #[specta(type = String)]
    pub key: CompactString,
    #[specta(type = Vec<String>)]
    pub aliases: Vec<CompactString>,
    pub description: String,
    #[specta(type = String)]
    pub color: CompactString,
    pub space_id: Uuid,
    pub scope_id: Uuid,
    pub owner_id: Option<Uuid>,
    pub access_policy: AccessPolicy,
    pub access_channel_id: Option<Uuid>,
    pub scope_version: Uuid,
    pub archived_at: Option<DateTime<Utc>>,
    #[specta(type = Vec<String>)]
    pub tags: Vec<CompactString>,
    pub asset_ids: Vec<Uuid>,
    pub created: DateTime<Utc>,
    pub modified: DateTime<Utc>,
    pub version: Uuid,
}

impl Character {
    pub async fn create(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        space_id: Uuid,
        owner_id: Uuid,
        name: &str,
        key: &str,
        aliases: Vec<String>,
        description: &str,
        color: &str,
        access_policy: AccessPolicy,
        access_channel_id: Option<Uuid>,
        tags: Vec<String>,
        asset_ids: Vec<Uuid>,
    ) -> Result<Character, ModelError> {
        use crate::validators;

        let name = name.trim();
        validators::CHARACTER_NAME.run(name)?;
        validators::DESCRIPTION.run(description)?;
        let color = color.trim();
        if !color.is_empty() {
            validators::HEX_COLOR.run(color)?;
        }
        let key = normalize_ident(key)?;
        let aliases = normalize_aliases(aliases, Some(&key))?;
        let tags = crate::validators::normalize_tags(tags)?;
        validate_access_channel(db, space_id, access_channel_id).await?;
        let character_id = Uuid::now_v7();
        let scope_id = Uuid::now_v7();

        sqlx::query_file!(
            "sql/characters/create_scope.sql",
            scope_id,
            space_id,
            owner_id,
            access_policy.as_str(),
            access_channel_id,
        )
        .execute(&mut **db)
        .await?;
        sqlx::query_file!(
            "sql/characters/create.sql",
            character_id,
            name,
            description,
            color,
            space_id,
            scope_id,
            &tags
        )
        .execute(&mut **db)
        .await
        .map_err(ModelError::from)?;
        insert_character_identifiers(&mut **db, space_id, character_id, &key, &aliases).await?;
        crate::assets::models::replace_character_assets(db, space_id, character_id, &asset_ids)
            .await?;
        Self::get_by_id(&mut **db, &character_id)
            .await?
            .ok_or(ModelError::NotFound("Character"))
    }

    pub async fn get_by_id<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        character_id: &Uuid,
    ) -> Result<Option<Character>, sqlx::Error> {
        sqlx::query_file_as!(Character, "sql/characters/get_by_id.sql", character_id)
            .fetch_optional(db)
            .await
    }

    pub async fn get_by_id_in_space<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
        character_id: &Uuid,
    ) -> Result<Option<Character>, sqlx::Error> {
        Ok(Self::get_by_id(db, character_id)
            .await?
            .filter(|character| character.space_id == space_id))
    }

    pub async fn list_by_space<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: &Uuid,
    ) -> Result<Vec<Character>, sqlx::Error> {
        let characters =
            sqlx::query_file_as!(Character, "sql/characters/list_by_space.sql", space_id)
                .fetch_all(db)
                .await?;
        Ok(characters)
    }

    pub fn can_view(&self, user_id: Option<Uuid>, context: ResourceAccessContext) -> bool {
        self.access_policy.can_view(self.owner_id, user_id, context)
    }

    pub fn can_edit(&self, user_id: Uuid, context: ResourceAccessContext) -> bool {
        self.access_policy.can_edit(self.owner_id, user_id, context)
    }

    pub async fn update(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        character_id: &Uuid,
        expected_version: Uuid,
        expected_scope_version: Uuid,
        name: String,
        key: String,
        aliases: Vec<String>,
        description: String,
        color: String,
        access_policy: AccessPolicy,
        access_channel_id: Option<Uuid>,
        tags: Vec<String>,
        asset_ids: Vec<Uuid>,
    ) -> Result<Option<Character>, ModelError> {
        use crate::validators;

        let name = name.trim().to_string();
        validators::CHARACTER_NAME.run(&name)?;
        validators::DESCRIPTION.run(&description)?;
        let color = color.trim().to_string();
        if !color.is_empty() {
            validators::HEX_COLOR.run(&color)?;
        }
        let key = normalize_ident(&key)?;
        let aliases = normalize_aliases(aliases, Some(&key))?;
        let tags = crate::validators::normalize_tags(tags)?;
        let target_space_id = sqlx::query_scalar!(
            "SELECT space_id FROM characters WHERE id = $1",
            character_id,
        )
        .fetch_optional(&mut **db)
        .await?
        .ok_or(ModelError::NotFound("Character"))?;
        validate_access_channel(db, target_space_id, access_channel_id).await?;

        let target = sqlx::query_file!(
            "sql/characters/update.sql",
            character_id,
            expected_version,
            expected_scope_version,
            name,
            description,
            color,
            &tags,
            access_policy.as_str(),
            access_channel_id,
        )
        .fetch_optional(&mut **db)
        .await
        .map_err(ModelError::from)?;
        let Some(target) = target else {
            return Ok(None);
        };
        replace_character_identifiers(&mut **db, target.space_id, *character_id, &key, &aliases)
            .await?;
        crate::assets::models::replace_character_assets(
            db,
            target.space_id,
            *character_id,
            &asset_ids,
        )
        .await?;
        Self::get_by_id(&mut **db, character_id)
            .await
            .map_err(Into::into)
    }

    pub async fn delete<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        character_id: &Uuid,
    ) -> Result<Vec<Uuid>, sqlx::Error> {
        sqlx::query_file_scalar!("sql/characters/delete.sql", character_id)
            .fetch_all(db)
            .await
    }

    pub async fn set_archived(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        character_id: &Uuid,
        expected_version: Uuid,
        archived: bool,
    ) -> Result<Option<Character>, sqlx::Error> {
        let updated_id = sqlx::query_file_scalar!(
            "sql/characters/set_archived.sql",
            character_id,
            expected_version,
            archived
        )
        .fetch_optional(&mut **db)
        .await?;
        let Some(updated_id) = updated_id else {
            return Ok(None);
        };
        Self::get_by_id(&mut **db, &updated_id).await
    }

    pub async fn exists_identifier<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
        key: Option<&str>,
        aliases: Option<&[String]>,
    ) -> Result<bool, ModelError> {
        let key = key.map(normalize_ident).transpose()?;
        let aliases = aliases
            .map(|aliases| normalize_aliases(aliases.to_vec(), key.as_deref()))
            .transpose()?
            .unwrap_or_default();
        let identifiers = key.into_iter().chain(aliases).collect::<Vec<_>>();

        sqlx::query_file_scalar!(
            "sql/characters/check_identifiers.sql",
            space_id,
            &identifiers
        )
        .fetch_one(db)
        .await
        .map_err(Into::into)
    }
}

async fn insert_character_identifiers(
    db: &mut sqlx::PgConnection,
    space_id: Uuid,
    character_id: Uuid,
    key: &str,
    aliases: &[String],
) -> Result<(), ModelError> {
    let identifiers = std::iter::once(key.to_string())
        .chain(aliases.iter().cloned())
        .collect::<Vec<_>>();
    sqlx::query_file!(
        "sql/characters/insert_identifiers.sql",
        space_id,
        character_id,
        &identifiers
    )
    .execute(&mut *db)
    .await?;
    Ok(())
}

async fn bind_character_scope(
    db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    character_id: Uuid,
    scope_id: Uuid,
    purpose: &str,
) -> Result<(), ModelError> {
    let binding = sqlx::query_file!(
        "sql/characters/bind_scope.sql",
        character_id,
        scope_id,
        purpose
    )
    .execute(&mut **db)
    .await?;
    if binding.rows_affected() == 0 {
        return Err(ModelError::NotFound("Character Scope"));
    }
    Ok(())
}

async fn replace_character_identifiers(
    db: &mut sqlx::PgConnection,
    space_id: Uuid,
    character_id: Uuid,
    key: &str,
    aliases: &[String],
) -> Result<(), ModelError> {
    sqlx::query_file!("sql/characters/delete_identifiers.sql", character_id)
        .execute(&mut *db)
        .await?;
    insert_character_identifiers(db, space_id, character_id, key, aliases).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::spaces::{AccessPolicy, ResourceAccessContext, Space};
    use crate::users::User;
    use uuid::Uuid;

    fn unique_name(prefix: &str) -> String {
        let raw = Uuid::new_v4().simple().to_string();
        format!("{prefix}_{}", &raw[..6])
    }

    #[test]
    fn identifier_normalization_accepts_single_characters_and_uses_nfc() {
        assert_eq!(normalize_ident(" 力 "), Ok("力".to_string()));
        assert_eq!(normalize_ident(" e\u{301} "), Ok("é".to_string()));
        assert_eq!(normalize_ident("a\t b"), Ok("a__b".to_string()));
    }

    #[test]
    fn identifier_aliases_are_limited_after_normalization_and_deduplication() {
        let aliases = (0..IDENTIFIER_ALIAS_MAX_COUNT)
            .map(|index| format!("alias_{index}"))
            .chain([" ".to_string(), "ALIAS_0".to_string()])
            .collect();
        assert_eq!(
            normalize_aliases(aliases, None)
                .expect("16 unique aliases should be valid")
                .len(),
            IDENTIFIER_ALIAS_MAX_COUNT
        );

        let too_many = (0..=IDENTIFIER_ALIAS_MAX_COUNT)
            .map(|index| format!("alias_{index}"))
            .collect();
        assert_eq!(
            normalize_aliases(too_many, None),
            Err(ValidationFailed("Too many aliases (max 16)."))
        );
    }

    #[test]
    fn identifier_aliases_ignore_the_normalized_primary() {
        assert_eq!(
            normalize_aliases(
                vec![
                    "e\u{301}".to_string(),
                    "É".to_string(),
                    "Health".to_string(),
                ],
                Some("é"),
            ),
            Ok(vec!["Health".to_string()])
        );
    }

    async fn create_test_user(pool: &sqlx::PgPool, prefix: &str) -> User {
        let raw = Uuid::new_v4().simple().to_string();
        let username = format!("{prefix}_{}", &raw[..8]);
        let email = format!("{prefix}_{raw}@example.com");
        User::register(pool, &email, &username, "Character Tester", "CharPass123!")
            .await
            .expect("failed to create test user")
    }

    async fn create_test_space(pool: &sqlx::PgPool, owner: &User, prefix: &str) -> Space {
        let name = unique_name(prefix);
        let description = format!("Description for {name}");
        Space::create(pool, name, &owner.id, description, None, Some("d20"))
            .await
            .expect("failed to create space")
    }

    async fn create_test_character(
        pool: &sqlx::PgPool,
        space: &Space,
        owner: &User,
        name: &str,
        key: &str,
        aliases: Vec<String>,
    ) -> Character {
        let mut transaction = pool.begin().await.expect("failed to begin transaction");
        let character = Character::create(
            &mut transaction,
            space.id,
            owner.id,
            name,
            key,
            aliases,
            "",
            "",
            AccessPolicy::Secret,
            None,
            vec![],
            vec![],
        )
        .await
        .expect("failed to create test character");
        transaction
            .commit()
            .await
            .expect("failed to commit test character");
        character
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_character_crud_and_lookup(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool, "owner").await;
        let space = create_test_space(&pool, &owner, "char_space").await;

        let character = create_test_character(
            &pool,
            &space,
            &owner,
            "Homura",
            "homura",
            vec!["homu".to_string()],
        )
        .await;

        let initial_scope = crate::scopes::models::Scope::get_by_id(&pool, character.scope_id)
            .await
            .expect("get character scope failed")
            .expect("character scope missing");
        assert_ne!(initial_scope.id, character.id);
        assert_eq!(
            initial_scope.kind,
            crate::scopes::models::ScopeKind::Character
        );
        assert_eq!(initial_scope.owner_id, Some(owner.id));
        assert_eq!(character.owner_id, initial_scope.owner_id);
        assert_eq!(character.scope_version, initial_scope.version);
        let main_scope_id = sqlx::query_scalar!(
            "SELECT main_scope_id FROM characters WHERE id = $1",
            character.id
        )
        .fetch_one(&pool)
        .await
        .expect("get Character main Scope failed");
        assert_eq!(main_scope_id, character.scope_id);

        let private_scope_id = Uuid::now_v7();
        let mut private_scope_transaction =
            pool.begin().await.expect("begin private Scope creation");
        sqlx::query_file!(
            "sql/characters/create_scope.sql",
            private_scope_id,
            space.id,
            owner.id,
            AccessPolicy::Secret.as_str(),
            None::<Uuid>
        )
        .execute(&mut *private_scope_transaction)
        .await
        .expect("create private character Scope failed");
        bind_character_scope(
            &mut private_scope_transaction,
            character.id,
            private_scope_id,
            "private",
        )
        .await
        .expect("bind private character Scope failed");
        private_scope_transaction
            .commit()
            .await
            .expect("commit private Scope creation");
        assert_eq!(initial_scope.access_policy, AccessPolicy::Secret);
        assert_eq!(initial_scope.access_channel_id, None);
        let owner_access = ResourceAccessContext {
            can_view: true,
            is_member: true,
            is_game_master: false,
            can_manage: false,
        };
        assert!(character.can_view(Some(owner.id), owner_access));
        assert!(character.can_edit(owner.id, owner_access));

        let other_member_id = Uuid::now_v7();
        assert!(!character.can_view(Some(other_member_id), owner_access));
        assert!(!character.can_edit(other_member_id, owner_access));

        let admin_id = Uuid::now_v7();
        let admin_access = ResourceAccessContext {
            can_view: true,
            is_member: true,
            is_game_master: false,
            can_manage: true,
        };
        assert!(!character.can_view(Some(admin_id), admin_access));
        assert!(!character.can_edit(admin_id, admin_access));

        let exists_by_alias_trimmed =
            Character::exists_identifier(&pool, space.id, Some(" homu "), None)
                .await
                .expect("exists_identifier failed");
        assert!(exists_by_alias_trimmed);

        let fetched = Character::get_by_id(&pool, &character.id)
            .await
            .expect("get_by_id failed")
            .expect("character not found");
        assert_eq!(fetched.id, character.id);

        let list = Character::list_by_space(&pool, &space.id)
            .await
            .expect("list_by_space failed");
        assert!(list.iter().any(|item| item.id == character.id));

        let mut conflicting_transaction = pool.begin().await.expect("failed to begin transaction");
        let conflicting_name = Character::create(
            &mut conflicting_transaction,
            space.id,
            owner.id,
            "Another Homura",
            "HOMU",
            vec![],
            "",
            "",
            AccessPolicy::Secret,
            None,
            vec![],
            vec![],
        )
        .await;
        assert!(
            matches!(conflicting_name, Err(ModelError::Conflict(_))),
            "a character key must not collide with another character's alias"
        );

        let mut update_transaction = pool.begin().await.expect("failed to begin transaction");
        let updated = Character::update(
            &mut update_transaction,
            &character.id,
            character.version,
            character.scope_version,
            "Akemi Homura".to_string(),
            "akemi_homura".to_string(),
            vec![],
            "Hentai".to_string(),
            String::new(),
            AccessPolicy::Public,
            None,
            vec![
                " Player ".to_string(),
                "第一幕".to_string(),
                "player".to_string(),
                String::new(),
            ],
            vec![],
        )
        .await
        .expect("update failed")
        .expect("character not found on update");
        update_transaction
            .commit()
            .await
            .expect("failed to commit character update");
        assert_eq!(updated.name, "Akemi Homura");
        assert_eq!(updated.key, "akemi_homura");
        assert!(updated.aliases.is_empty());
        assert_eq!(updated.access_policy, AccessPolicy::Public);
        assert_eq!(updated.access_channel_id, None);
        assert_ne!(updated.version, character.version);
        assert_ne!(updated.scope_version, character.scope_version);
        assert_eq!(updated.description, "Hentai");
        assert!(updated.archived_at.is_none());
        assert_eq!(updated.tags, vec!["Player", "第一幕", "player"]);
        let viewer_access = ResourceAccessContext {
            can_view: true,
            is_member: false,
            is_game_master: false,
            can_manage: false,
        };
        assert!(updated.can_view(None, viewer_access));
        assert!(!updated.can_edit(other_member_id, viewer_access));

        let mut stale_transaction = pool.begin().await.expect("failed to begin stale update");
        let stale_update = Character::update(
            &mut stale_transaction,
            &character.id,
            character.version,
            updated.scope_version,
            updated.name.to_string(),
            updated.key.to_string(),
            updated.aliases.iter().map(ToString::to_string).collect(),
            updated.description.clone(),
            updated.color.to_string(),
            updated.access_policy,
            updated.access_channel_id,
            updated.tags.iter().map(ToString::to_string).collect(),
            updated.asset_ids.clone(),
        )
        .await
        .expect("stale update query failed");
        assert!(stale_update.is_none());
        stale_transaction
            .rollback()
            .await
            .expect("failed to rollback stale update");

        let mut stale_scope_transaction = pool
            .begin()
            .await
            .expect("failed to begin stale Scope update");
        let stale_scope_update = Character::update(
            &mut stale_scope_transaction,
            &character.id,
            updated.version,
            character.scope_version,
            updated.name.to_string(),
            updated.key.to_string(),
            updated.aliases.iter().map(ToString::to_string).collect(),
            updated.description.clone(),
            updated.color.to_string(),
            updated.access_policy,
            updated.access_channel_id,
            updated.tags.iter().map(ToString::to_string).collect(),
            updated.asset_ids.clone(),
        )
        .await
        .expect("stale Scope update query failed");
        assert!(stale_scope_update.is_none());
        stale_scope_transaction
            .rollback()
            .await
            .expect("failed to rollback stale Scope update");

        let updated_scope = crate::scopes::models::Scope::get_by_id(&pool, character.scope_id)
            .await
            .expect("get updated character scope failed")
            .expect("updated character scope missing");
        assert_eq!(updated_scope.access_policy, AccessPolicy::Public);
        assert_eq!(updated_scope.access_channel_id, None);
        assert_ne!(updated_scope.version, initial_scope.version);
        assert_eq!(updated.scope_version, updated_scope.version);

        let exists_by_key =
            Character::exists_identifier(&pool, space.id, Some("akemi_homura"), None)
                .await
                .expect("exists_identifier failed");
        assert!(exists_by_key);

        let exists_by_alias = Character::exists_identifier(&pool, space.id, Some("homura"), None)
            .await
            .expect("exists_identifier failed");
        assert!(!exists_by_alias);

        let mut archive_transaction = pool.begin().await.expect("failed to begin archive");
        let archived = Character::set_archived(
            &mut archive_transaction,
            &character.id,
            updated.version,
            true,
        )
        .await
        .expect("archive failed")
        .expect("character missing on archive");
        archive_transaction
            .commit()
            .await
            .expect("failed to commit archive");
        assert!(archived.archived_at.is_some());
        assert_ne!(archived.version, updated.version);
        assert!(
            Character::exists_identifier(&pool, space.id, Some("akemi_homura"), None)
                .await
                .expect("identifier lookup after archive failed"),
            "archiving must retain the character identifiers"
        );

        let mut restore_transaction = pool.begin().await.expect("failed to begin restore");
        let restored = Character::set_archived(
            &mut restore_transaction,
            &character.id,
            archived.version,
            false,
        )
        .await
        .expect("restore failed")
        .expect("character missing on restore");
        restore_transaction
            .commit()
            .await
            .expect("failed to commit restore");
        assert!(restored.archived_at.is_none());
        assert_ne!(restored.version, archived.version);

        let mut stale_archive_transaction =
            pool.begin().await.expect("failed to begin stale archive");
        assert!(
            Character::set_archived(
                &mut stale_archive_transaction,
                &character.id,
                archived.version,
                true
            )
            .await
            .expect("stale archive query failed")
            .is_none()
        );
        stale_archive_transaction
            .rollback()
            .await
            .expect("failed to roll back stale archive");

        let mut deleted_scope_ids = Character::delete(&pool, &character.id)
            .await
            .expect("delete failed");
        deleted_scope_ids.sort_unstable();
        let mut expected_scope_ids = vec![character.scope_id, private_scope_id];
        expected_scope_ids.sort_unstable();
        assert_eq!(deleted_scope_ids, expected_scope_ids);
        assert!(
            crate::scopes::models::Scope::get_by_id(&pool, character.scope_id)
                .await
                .expect("get deleted main Scope failed")
                .is_none()
        );
        assert!(
            crate::scopes::models::Scope::get_by_id(&pool, private_scope_id)
                .await
                .expect("get deleted private Scope failed")
                .is_none()
        );
    }
}
