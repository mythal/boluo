use chrono::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use uuid::Uuid;

use crate::cache::{CACHE, CacheType};
use crate::error::{ModelError, ValidationFailed};
use crate::ttl::{Lifespan, fetch_entry, fetch_entry_optional, hour, minute};
use crate::utils::merge_blank;

pub(crate) fn normalize_ident(value: &str) -> Result<String, ValidationFailed> {
    let value = merge_blank(value);
    crate::validators::IDENT.run(&value)?;
    Ok(value)
}

pub(crate) fn normalize_optional_ident(
    value: Option<String>,
) -> Result<Option<String>, ValidationFailed> {
    let Some(value) = value else {
        return Ok(None);
    };
    let value = merge_blank(&value);
    if value.is_empty() {
        return Ok(None);
    }
    crate::validators::IDENT.run(&value)?;
    Ok(Some(value))
}

pub(crate) fn normalize_aliases(values: Vec<String>) -> Result<Vec<String>, ValidationFailed> {
    let mut seen = HashSet::new();
    let mut normalized = Vec::new();
    for value in values {
        let value = merge_blank(&value);
        if value.is_empty() {
            continue;
        }
        crate::validators::IDENT.run(&value)?;
        if seen.insert(value.clone()) {
            normalized.push(value);
        }
    }
    Ok(normalized)
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, specta::Type, sqlx::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(type_name = "character_visibility", rename_all = "PascalCase")]
pub enum CharacterVisibility {
    Private,
    Public,
}

impl CharacterVisibility {
    pub fn as_str(self) -> &'static str {
        match self {
            CharacterVisibility::Private => "Private",
            CharacterVisibility::Public => "Public",
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type, sqlx::Type)]
#[sqlx(type_name = "characters")]
#[serde(rename_all = "camelCase")]
pub struct Character {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub color: String,
    pub alias: Option<String>,
    pub image_id: Option<Uuid>,
    pub space_id: Uuid,
    pub owner_id: Uuid,
    pub visibility: CharacterVisibility,
    pub is_archived: bool,
    pub metadata: serde_json::Value,
    pub created: DateTime<Utc>,
    pub modified: DateTime<Utc>,
}

impl Lifespan for Character {
    fn ttl_sec() -> u64 {
        hour::TWO
    }
}

fn insert_character_cache(character: &Character) {
    CACHE
        .Character
        .insert(character.id, character.clone().into());
}

impl Character {
    pub async fn create<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
        owner_id: Uuid,
        name: &str,
        description: &str,
        color: &str,
        alias: Option<String>,
        image_id: Option<Uuid>,
        visibility: CharacterVisibility,
        is_archived: bool,
        metadata: serde_json::Value,
    ) -> Result<Character, ModelError> {
        use crate::validators;

        let name = merge_blank(name);
        validators::DISPLAY_NAME.run(&name)?;
        validators::DESCRIPTION.run(description)?;
        let color = merge_blank(color);
        if !color.is_empty() {
            validators::HEX_COLOR.run(&color)?;
        }
        let alias = normalize_optional_ident(alias)?;
        let visibility = visibility.as_str();

        sqlx::query_file_scalar!(
            "sql/characters/create.sql",
            name,
            description,
            color,
            alias,
            image_id,
            space_id,
            owner_id,
            visibility,
            is_archived,
            metadata,
        )
        .fetch_one(db)
        .await
        .inspect(insert_character_cache)
        .map_err(Into::into)
    }

    pub async fn get_by_id<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        character_id: &Uuid,
    ) -> Result<Option<Character>, sqlx::Error> {
        let character_id = *character_id;
        fetch_entry_optional(&CACHE.Character, character_id, async move {
            sqlx::query_file_scalar!("sql/characters/get_by_id.sql", character_id)
                .fetch_one(db)
                .await
        })
        .await
    }

    pub async fn list_by_space<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: &Uuid,
    ) -> Result<Vec<Character>, sqlx::Error> {
        let characters = sqlx::query_file_scalar!("sql/characters/list_by_space.sql", space_id)
            .fetch_all(db)
            .await?;
        for character in &characters {
            insert_character_cache(character);
        }
        Ok(characters)
    }

    pub async fn update<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        character_id: &Uuid,
        name: Option<String>,
        description: Option<String>,
        color: Option<String>,
        alias: Option<String>,
        image_id: Option<Uuid>,
        visibility: Option<CharacterVisibility>,
        is_archived: Option<bool>,
        metadata: Option<serde_json::Value>,
    ) -> Result<Option<Character>, ModelError> {
        use crate::validators;

        let name = if let Some(name) = name {
            let name = merge_blank(&name);
            validators::DISPLAY_NAME.run(&name)?;
            Some(name)
        } else {
            None
        };

        let description = if let Some(description) = description {
            validators::DESCRIPTION.run(&description)?;
            Some(description)
        } else {
            None
        };

        let color = if let Some(color) = color {
            let color = merge_blank(&color);
            if !color.is_empty() {
                validators::HEX_COLOR.run(&color)?;
            }
            Some(color)
        } else {
            None
        };

        let alias = if let Some(alias) = alias {
            let alias = merge_blank(&alias);
            if !alias.is_empty() {
                validators::IDENT.run(&alias)?;
            }
            Some(alias)
        } else {
            None
        };

        let visibility = visibility.map(CharacterVisibility::as_str);

        sqlx::query_file_scalar!(
            "sql/characters/update.sql",
            character_id,
            name.as_deref(),
            description.as_deref(),
            color.as_deref(),
            alias.as_deref(),
            image_id,
            visibility,
            is_archived,
            metadata,
        )
        .fetch_optional(db)
        .await
        .inspect(|character| {
            if let Some(character) = character {
                insert_character_cache(character);
            }
        })
        .map_err(Into::into)
    }

    pub async fn delete<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        character_id: &Uuid,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query_file!("sql/characters/delete.sql", character_id)
            .execute(db)
            .await?;
        if result.rows_affected() > 0 {
            CACHE.invalidate(CacheType::Character, *character_id).await;
            CACHE
                .invalidate(CacheType::CharacterVariables, *character_id)
                .await;
            return Ok(true);
        }
        Ok(false)
    }

    pub async fn exists_name_or_alias<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
        name: Option<&str>,
        alias: Option<&str>,
    ) -> Result<bool, sqlx::Error> {
        sqlx::query_file_scalar!("sql/characters/check_name_alias.sql", space_id, name, alias)
            .fetch_one(db)
            .await
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type, sqlx::Type)]
#[sqlx(type_name = "character_variables")]
#[serde(rename_all = "camelCase")]
pub struct CharacterVariable {
    pub key: String,
    pub character_id: Uuid,
    pub display_name: String,
    pub alias: Vec<String>,
    pub sort: i32,
    pub track_history: bool,
    pub value: serde_json::Value,
    pub metadata: serde_json::Value,
    pub created: DateTime<Utc>,
    pub modified: DateTime<Utc>,
}

#[derive(Default, Debug, Clone)]
pub struct CharacterVariables(pub Vec<CharacterVariable>);

impl Lifespan for CharacterVariables {
    fn ttl_sec() -> u64 {
        minute::TWO
    }
}

impl CharacterVariable {
    pub fn default_track_history() -> bool {
        true
    }

    pub async fn create<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        character_id: Uuid,
        key: &str,
        display_name: &str,
        alias: Vec<String>,
        sort: i32,
        track_history: bool,
        value: serde_json::Value,
        metadata: serde_json::Value,
    ) -> Result<CharacterVariable, ModelError> {
        let key = normalize_ident(key)?;
        let display_name = merge_blank(display_name);
        let alias = normalize_aliases(alias)?;
        let variable = sqlx::query_file_scalar!(
            "sql/characters/variables/create.sql",
            key,
            character_id,
            display_name,
            &alias,
            sort,
            track_history,
            value,
            metadata,
        )
        .fetch_one(db)
        .await
        .map_err(ModelError::from)?;
        CACHE
            .invalidate(CacheType::CharacterVariables, character_id)
            .await;
        Ok(variable)
    }

    pub async fn get_by_key<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        character_id: &Uuid,
        key: &str,
    ) -> Result<Option<CharacterVariable>, sqlx::Error> {
        let variables = CharacterVariable::list_by_character(db, character_id).await?;
        Ok(variables
            .into_iter()
            .find(|variable| variable.key.eq_ignore_ascii_case(key)))
    }

    pub async fn list_by_character<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        character_id: &Uuid,
    ) -> Result<Vec<CharacterVariable>, sqlx::Error> {
        let character_id = *character_id;
        let variables = fetch_entry(&CACHE.CharacterVariables, character_id, async move {
            sqlx::query_file_scalar!(
                "sql/characters/variables/list_by_character.sql",
                character_id
            )
            .fetch_all(db)
            .await
            .map(CharacterVariables)
        })
        .await?;
        Ok(variables.0)
    }

    pub async fn update<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        character_id: &Uuid,
        key: &str,
        display_name: Option<String>,
        alias: Option<Vec<String>>,
        sort: Option<i32>,
        track_history: Option<bool>,
        value: Option<serde_json::Value>,
        metadata: Option<serde_json::Value>,
    ) -> Result<Option<CharacterVariable>, ModelError> {
        let key = normalize_ident(key)?;
        let display_name = display_name.map(|value| merge_blank(&value));
        let alias = match alias {
            Some(alias) => Some(normalize_aliases(alias)?),
            None => None,
        };
        let variable = sqlx::query_file_scalar!(
            "sql/characters/variables/update.sql",
            character_id,
            key,
            display_name.as_deref(),
            alias.as_ref().map(|alias| alias.as_slice()),
            sort,
            track_history,
            value,
            metadata,
        )
        .fetch_optional(db)
        .await
        .map_err(ModelError::from)?;
        if variable.is_some() {
            CACHE
                .invalidate(CacheType::CharacterVariables, *character_id)
                .await;
        }
        Ok(variable)
    }

    pub async fn delete<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        character_id: &Uuid,
        key: &str,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query_file!("sql/characters/variables/delete.sql", character_id, key)
            .execute(db)
            .await?;
        if result.rows_affected() > 0 {
            CACHE
                .invalidate(CacheType::CharacterVariables, *character_id)
                .await;
            return Ok(true);
        }
        Ok(false)
    }

    pub async fn exists_key_or_alias<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        character_id: Uuid,
        key: Option<&str>,
        alias: Option<&[String]>,
    ) -> Result<bool, sqlx::Error> {
        sqlx::query_file_scalar!(
            "sql/characters/variables/check_key_alias.sql",
            character_id,
            key,
            alias
        )
        .fetch_one(db)
        .await
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, specta::Type, sqlx::Type)]
#[sqlx(type_name = "character_variable_history")]
#[serde(rename_all = "camelCase")]
pub struct CharacterVariableHistory {
    pub id: Uuid,
    pub operator_id: Option<Uuid>,
    pub character_id: Uuid,
    pub reason: Option<serde_json::Value>,
    pub key: String,
    pub value: serde_json::Value,
    pub created: DateTime<Utc>,
}

impl CharacterVariableHistory {
    pub async fn create<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        operator_id: Option<Uuid>,
        character_id: Uuid,
        reason: Option<serde_json::Value>,
        key: &str,
        value: serde_json::Value,
    ) -> Result<(), sqlx::Error> {
        sqlx::query_file!(
            "sql/characters/variables/insert_history.sql",
            operator_id,
            character_id,
            reason,
            key,
            value,
        )
        .execute(db)
        .await?;
        Ok(())
    }

    pub async fn list_by_key<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        character_id: &Uuid,
        key: &str,
    ) -> Result<Vec<CharacterVariableHistory>, sqlx::Error> {
        sqlx::query_file_scalar!(
            "sql/characters/variables/history_by_key.sql",
            character_id,
            key
        )
        .fetch_all(db)
        .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::spaces::{Space, SpaceMember};
    use crate::users::User;
    use serde_json::json;
    use uuid::Uuid;

    fn unique_name(prefix: &str) -> String {
        let raw = Uuid::new_v4().simple().to_string();
        format!("{prefix}_{}", &raw[..6])
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
        let space = Space::create(pool, name, &owner.id, description, None, Some("d20"))
            .await
            .expect("failed to create space");
        SpaceMember::add_admin(pool, &owner.id, &space.id)
            .await
            .expect("failed to add owner as admin");
        space
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_character_crud_and_lookup(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool, "owner").await;
        let space = create_test_space(&pool, &owner, "char_space").await;

        let character = Character::create(
            &pool,
            space.id,
            owner.id,
            "Homura",
            "Time traveler",
            "#7c4dff",
            Some("homura".to_string()),
            None,
            CharacterVisibility::Private,
            false,
            json!({}),
        )
        .await
        .expect("failed to create character");

        let fetched = Character::get_by_id(&pool, &character.id)
            .await
            .expect("get_by_id failed")
            .expect("character not found");
        assert_eq!(fetched.id, character.id);

        let list = Character::list_by_space(&pool, &space.id)
            .await
            .expect("list_by_space failed");
        assert!(list.iter().any(|item| item.id == character.id));

        let updated = Character::update(
            &pool,
            &character.id,
            Some("Akemi Homura".to_string()),
            None,
            None,
            Some(String::new()),
            None,
            Some(CharacterVisibility::Public),
            Some(true),
            Some(json!({"role": "pc"})),
        )
        .await
        .expect("update failed")
        .expect("character not found on update");
        assert_eq!(updated.name, "Akemi Homura");
        assert_eq!(updated.alias, None);
        assert_eq!(updated.visibility, CharacterVisibility::Public);
        assert!(updated.is_archived);

        let exists_by_name =
            Character::exists_name_or_alias(&pool, space.id, Some("Akemi Homura"), None)
                .await
                .expect("exists_name_or_alias failed");
        assert!(exists_by_name);

        let exists_by_alias =
            Character::exists_name_or_alias(&pool, space.id, None, Some("homura"))
                .await
                .expect("exists_name_or_alias failed");
        assert!(!exists_by_alias);

        let deleted = Character::delete(&pool, &character.id)
            .await
            .expect("delete failed");
        assert!(deleted);
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_character_variable_flow(pool: sqlx::PgPool) {
        let owner = create_test_user(&pool, "owner").await;
        let space = create_test_space(&pool, &owner, "var_space").await;
        let character = Character::create(
            &pool,
            space.id,
            owner.id,
            "Madoka",
            "",
            "",
            None,
            None,
            CharacterVisibility::Private,
            false,
            json!({}),
        )
        .await
        .expect("failed to create character");

        let variable = CharacterVariable::create(
            &pool,
            character.id,
            "hp",
            "HP",
            vec!["health".to_string()],
            0,
            true,
            json!(100),
            json!({}),
        )
        .await
        .expect("failed to create variable");
        assert_eq!(variable.key, "hp");

        let fetched = CharacterVariable::get_by_key(&pool, &character.id, "HP")
            .await
            .expect("get_by_key failed")
            .expect("variable not found");
        assert_eq!(fetched.key, "hp");

        let variables = CharacterVariable::list_by_character(&pool, &character.id)
            .await
            .expect("list_by_character failed");
        assert_eq!(variables.len(), 1);

        let updated = CharacterVariable::update(
            &pool,
            &character.id,
            "hp",
            Some("Health".to_string()),
            Some(vec!["health".to_string(), "HP".to_string()]),
            Some(1),
            Some(false),
            Some(json!(80)),
            Some(json!({"unit": "points"})),
        )
        .await
        .expect("update failed")
        .expect("variable not found on update");
        assert_eq!(updated.display_name, "Health");
        assert!(!updated.track_history);

        let exists_key =
            CharacterVariable::exists_key_or_alias(&pool, character.id, Some("hp"), None)
                .await
                .expect("exists_key_or_alias failed");
        assert!(exists_key);

        let alias_check = vec!["HP".to_string()];
        let exists_alias =
            CharacterVariable::exists_key_or_alias(&pool, character.id, None, Some(&alias_check))
                .await
                .expect("exists_key_or_alias failed");
        assert!(exists_alias);

        let missing_alias = vec!["mp".to_string()];
        let exists_missing =
            CharacterVariable::exists_key_or_alias(&pool, character.id, None, Some(&missing_alias))
                .await
                .expect("exists_key_or_alias failed");
        assert!(!exists_missing);

        CharacterVariableHistory::create(
            &pool,
            Some(owner.id),
            character.id,
            Some(json!({"reason": "damage"})),
            "hp",
            json!(79),
        )
        .await
        .expect("failed to create variable history");

        let history = CharacterVariableHistory::list_by_key(&pool, &character.id, "hp")
            .await
            .expect("list_by_key failed");
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].key, "hp");
    }
}
