use chrono::{DateTime, Utc};
use compact_str::CompactString;
use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use std::collections::BTreeMap;
use std::ops::Deref;
use uuid::Uuid;

use crate::characters::{normalize_aliases, normalize_ident};
use crate::error::{ModelError, ValidationFailed};

#[derive(Debug, Clone, sqlx::FromRow)]
struct EntryComponentRow {
    component_type: String,
    data: serde_json::Value,
    schema_version: i32,
    version: Uuid,
    modified: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    #[serde(flatten)]
    pub metadata: EntryMetadata,
    pub components: BTreeMap<String, EntryComponent>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, specta::Type, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct EntryMetadata {
    pub id: Uuid,
    pub scope_id: Uuid,
    #[specta(type = String)]
    pub key: CompactString,
    #[specta(type = Vec<String>)]
    pub aliases: Vec<CompactString>,
    #[specta(type = String)]
    pub display_name: CompactString,
    pub reference_note_id: Option<Uuid>,
    #[specta(type = Vec<String>)]
    pub tags: Vec<CompactString>,
    pub sort: i32,
    pub metadata_version: Uuid,
    pub created: DateTime<Utc>,
    pub modified: DateTime<Utc>,
}

#[derive(Debug)]
struct CachedEntryComponent {
    component_type: CompactString,
    data: Box<RawValue>,
    schema_version: i32,
    version: Uuid,
    modified: DateTime<Utc>,
}

#[derive(Debug)]
pub(crate) struct CachedEntryComponents {
    components: Box<[CachedEntryComponent]>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct EntryComponent {
    pub data: serde_json::Value,
    pub schema_version: i32,
    pub version: Uuid,
    pub modified: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, specta::Type, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct EntryEffect {
    pub id: Uuid,
    pub space_id: Uuid,
    pub scope_id: Uuid,
    pub operator_id: Option<Uuid>,
    pub created: DateTime<Utc>,
}

impl EntryEffect {
    pub async fn create(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        space_id: Uuid,
        scope_id: Uuid,
        operator_id: Uuid,
    ) -> Result<Self, ModelError> {
        let id = Uuid::now_v7();
        sqlx::query_file_as!(
            EntryEffect,
            "sql/entries/create_effect.sql",
            id,
            scope_id,
            operator_id,
            space_id,
        )
        .fetch_optional(&mut **db)
        .await?
        .ok_or(ModelError::NotFound("Scope"))
    }

    pub async fn list_by_ids<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
        entry_effect_ids: &[Uuid],
    ) -> Result<Vec<Self>, sqlx::Error> {
        sqlx::query_file_as!(
            EntryEffect,
            "sql/entries/list_effects.sql",
            space_id,
            entry_effect_ids,
        )
        .fetch_all(db)
        .await
    }
}

impl Deref for Entry {
    type Target = EntryMetadata;

    fn deref(&self) -> &Self::Target {
        &self.metadata
    }
}

impl EntryMetadata {
    pub(crate) fn with_components(self, components: BTreeMap<String, EntryComponent>) -> Entry {
        Entry {
            metadata: self,
            components,
        }
    }

    pub(crate) async fn list_by_scope<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        scope_id: Uuid,
    ) -> Result<Vec<Self>, sqlx::Error> {
        sqlx::query_file_as!(EntryMetadata, "sql/entries/list.sql", scope_id)
            .fetch_all(db)
            .await
    }

    pub(crate) async fn list_by_space(
        db: &mut sqlx::PgConnection,
        space_id: Uuid,
    ) -> Result<Vec<Self>, sqlx::Error> {
        sqlx::query_file_as!(EntryMetadata, "sql/entries/list_by_space.sql", space_id)
            .fetch_all(db)
            .await
    }

    pub(crate) async fn get_by_id_for_update(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        entry_id: Uuid,
    ) -> Result<Option<Self>, sqlx::Error> {
        sqlx::query_file_as!(EntryMetadata, "sql/entries/get_for_update.sql", entry_id)
            .fetch_optional(&mut **db)
            .await
    }
}

impl CachedEntryComponents {
    pub(crate) async fn load(db: &sqlx::PgPool, entry_id: Uuid) -> Result<Self, sqlx::Error> {
        let rows = sqlx::query_file!("sql/entries/get_components_raw.sql", entry_id)
            .fetch_all(db)
            .await?;
        let components = rows
            .into_iter()
            .map(|row| {
                let data = RawValue::from_string(row.data).map_err(|error| {
                    sqlx::Error::Decode(Box::new(error) as Box<dyn std::error::Error + Send + Sync>)
                })?;
                Ok(CachedEntryComponent {
                    component_type: row.component_type,
                    data,
                    schema_version: row.schema_version,
                    version: row.version,
                    modified: row.modified,
                })
            })
            .collect::<Result<Box<[_]>, sqlx::Error>>()?;
        Ok(Self { components })
    }

    pub(crate) fn decode_for_response(
        &self,
    ) -> Result<BTreeMap<String, EntryComponent>, serde_json::Error> {
        self.components
            .iter()
            .map(|component| {
                Ok((
                    component.component_type.to_string(),
                    EntryComponent {
                        data: serde_json::from_str(component.data.get())?,
                        schema_version: component.schema_version,
                        version: component.version,
                        modified: component.modified,
                    },
                ))
            })
            .collect()
    }
}

fn validate_components(
    components: &BTreeMap<String, serde_json::Value>,
) -> Result<(), ValidationFailed> {
    for component_type in components.keys() {
        validate_component_type(component_type)?;
    }
    Ok(())
}

fn validate_component_type(component_type: &str) -> Result<(), ValidationFailed> {
    // Component types are namespaced identifiers. By convention, `core/` is
    // reserved for built-in components; ownership is not enforced yet.
    crate::validators::NAMESPACED_TYPE.run(component_type)
}

fn components_from_rows(
    rows: impl IntoIterator<Item = EntryComponentRow>,
) -> BTreeMap<String, EntryComponent> {
    rows.into_iter()
        .map(|row| {
            (
                row.component_type,
                EntryComponent {
                    data: row.data,
                    schema_version: row.schema_version,
                    version: row.version,
                    modified: row.modified,
                },
            )
        })
        .collect()
}

async fn insert_components(
    db: &mut sqlx::PgConnection,
    entry_id: Uuid,
    components: &BTreeMap<String, serde_json::Value>,
) -> Result<(), sqlx::Error> {
    for (component_type, data) in components {
        sqlx::query_file!(
            "sql/entries/insert_component.sql",
            entry_id,
            component_type,
            data,
        )
        .execute(&mut *db)
        .await?;
    }
    Ok(())
}

async fn validate_reference_note(
    db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    scope_id: Uuid,
    reference_note_id: Option<Uuid>,
) -> Result<(), ModelError> {
    let Some(note_id) = reference_note_id else {
        return Ok(());
    };
    let valid = sqlx::query_file_scalar!("sql/entries/validate_reference.sql", scope_id, note_id)
        .fetch_one(&mut **db)
        .await?;
    if !valid {
        return Err(ValidationFailed("Reference note must belong to the same space.").into());
    }
    Ok(())
}

async fn insert_identifiers(
    db: &mut sqlx::PgConnection,
    scope_id: Uuid,
    entry_id: Uuid,
    key: &str,
    aliases: &[String],
) -> Result<(), ModelError> {
    let identifiers = std::iter::once(key.to_string())
        .chain(aliases.iter().cloned())
        .collect::<Vec<_>>();
    sqlx::query_file!(
        "sql/entries/insert_identifiers.sql",
        scope_id,
        entry_id,
        &identifiers
    )
    .execute(db)
    .await?;
    Ok(())
}

impl Entry {
    pub async fn get_by_id(
        db: &sqlx::PgPool,
        scope_id: Uuid,
        entry_id: Uuid,
    ) -> Result<Option<Self>, sqlx::Error> {
        let Some(entry) =
            sqlx::query_file_as!(EntryMetadata, "sql/entries/get.sql", scope_id, entry_id)
                .fetch_optional(db)
                .await?
        else {
            return Ok(None);
        };
        let components = sqlx::query_file_as!(
            EntryComponentRow,
            "sql/entries/get_components.sql",
            entry_id
        )
        .fetch_all(db)
        .await?;
        Ok(Some(
            entry.with_components(components_from_rows(components)),
        ))
    }

    pub(crate) async fn get_by_id_in_transaction(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        scope_id: Uuid,
        entry_id: Uuid,
    ) -> Result<Option<Self>, sqlx::Error> {
        let Some(entry) =
            sqlx::query_file_as!(EntryMetadata, "sql/entries/get.sql", scope_id, entry_id)
                .fetch_optional(&mut **db)
                .await?
        else {
            return Ok(None);
        };
        let components = sqlx::query_file_as!(
            EntryComponentRow,
            "sql/entries/get_components.sql",
            entry_id
        )
        .fetch_all(&mut **db)
        .await?;
        Ok(Some(
            entry.with_components(components_from_rows(components)),
        ))
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn create(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        scope_id: Uuid,
        key: String,
        aliases: Vec<String>,
        display_name: String,
        reference_note_id: Option<Uuid>,
        components: BTreeMap<String, serde_json::Value>,
        tags: Vec<String>,
        sort: i32,
    ) -> Result<Self, ModelError> {
        let key = normalize_ident(&key)?;
        let aliases = normalize_aliases(aliases, Some(&key))?;
        let display_name = display_name.trim().to_string();
        crate::validators::DISPLAY_NAME.run(&display_name)?;
        validate_components(&components)?;
        let tags = crate::validators::normalize_tags(tags)?;
        validate_reference_note(db, scope_id, reference_note_id).await?;
        let entry_id = Uuid::now_v7();
        let result = sqlx::query_file!(
            "sql/entries/create.sql",
            entry_id,
            scope_id,
            display_name,
            reference_note_id,
            &tags,
            sort,
        )
        .execute(&mut **db)
        .await?;
        if result.rows_affected() == 0 {
            return Err(ModelError::NotFound("Scope"));
        }
        insert_identifiers(db, scope_id, entry_id, &key, &aliases).await?;
        insert_components(db, entry_id, &components).await?;
        Self::get_by_id_in_transaction(db, scope_id, entry_id)
            .await?
            .ok_or(ModelError::NotFound("Entry"))
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn update(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        scope_id: Uuid,
        entry_id: Uuid,
        expected_version: Uuid,
        key: String,
        aliases: Vec<String>,
        display_name: String,
        reference_note_id: Option<Uuid>,
        tags: Vec<String>,
        sort: i32,
    ) -> Result<Option<Self>, ModelError> {
        let key = normalize_ident(&key)?;
        let aliases = normalize_aliases(aliases, Some(&key))?;
        let display_name = display_name.trim().to_string();
        crate::validators::DISPLAY_NAME.run(&display_name)?;
        let tags = crate::validators::normalize_tags(tags)?;
        validate_reference_note(db, scope_id, reference_note_id).await?;
        let result = sqlx::query_file!(
            "sql/entries/update.sql",
            scope_id,
            entry_id,
            expected_version,
            display_name,
            reference_note_id,
            &tags,
            sort,
        )
        .execute(&mut **db)
        .await?;
        if result.rows_affected() == 0 {
            return Ok(None);
        }
        sqlx::query_file!("sql/entries/delete_identifiers.sql", entry_id)
            .execute(&mut **db)
            .await?;
        insert_identifiers(db, scope_id, entry_id, &key, &aliases).await?;
        Self::get_by_id_in_transaction(db, scope_id, entry_id)
            .await
            .map_err(Into::into)
    }

    pub async fn delete(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        scope_id: Uuid,
        entry_id: Uuid,
        expected_version: Uuid,
    ) -> Result<bool, sqlx::Error> {
        Ok(sqlx::query_file!(
            "sql/entries/delete.sql",
            scope_id,
            entry_id,
            expected_version
        )
        .execute(&mut **db)
        .await?
        .rows_affected()
            > 0)
    }

    pub async fn exists_identifier<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        scope_id: Uuid,
        key: Option<&str>,
        aliases: &[String],
    ) -> Result<bool, ModelError> {
        let key = key.map(normalize_ident).transpose()?;
        let aliases = normalize_aliases(aliases.to_vec(), key.as_deref())?;
        let identifiers = key.into_iter().chain(aliases).collect::<Vec<_>>();
        sqlx::query_file_scalar!("sql/entries/check_identifiers.sql", scope_id, &identifiers)
            .fetch_one(db)
            .await
            .map_err(Into::into)
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, specta::Type, sqlx::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(type_name = "entry_history_action", rename_all = "PascalCase")]
pub enum EntryHistoryAction {
    Create,
    Rename,
    Delete,
}

impl EntryHistoryAction {
    fn as_str(self) -> &'static str {
        match self {
            Self::Create => "Create",
            Self::Rename => "Rename",
            Self::Delete => "Delete",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct EntryHistory {
    pub entry_effect_id: Uuid,
    pub operator_id: Option<Uuid>,
    pub scope_id: Uuid,
    pub entry_id: Uuid,
    pub key: String,
    pub previous_key: Option<String>,
    pub action: EntryHistoryAction,
    pub created: DateTime<Utc>,
}

impl EntryHistory {
    #[allow(clippy::too_many_arguments)]
    pub async fn record(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        entry_effect_id: Uuid,
        entry_id: Uuid,
        key: &str,
        action: EntryHistoryAction,
    ) -> Result<(), ModelError> {
        if action == EntryHistoryAction::Rename {
            return Err(ValidationFailed("Rename history requires a previous key.").into());
        }
        Self::record_event(db, entry_effect_id, entry_id, key, None, action).await
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn record_rename(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        entry_effect_id: Uuid,
        entry_id: Uuid,
        previous_key: &str,
        key: &str,
    ) -> Result<(), ModelError> {
        Self::record_event(
            db,
            entry_effect_id,
            entry_id,
            key,
            Some(previous_key),
            EntryHistoryAction::Rename,
        )
        .await
    }

    #[allow(clippy::too_many_arguments)]
    async fn record_event(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        entry_effect_id: Uuid,
        entry_id: Uuid,
        key: &str,
        previous_key: Option<&str>,
        action: EntryHistoryAction,
    ) -> Result<(), ModelError> {
        let key = normalize_ident(key)?.to_lowercase();
        let previous_key = previous_key
            .map(normalize_ident)
            .transpose()?
            .map(|key| key.to_lowercase());
        if action == EntryHistoryAction::Rename && previous_key.as_deref() == Some(&key) {
            return Err(ValidationFailed("Rename history requires two different keys.").into());
        }
        let result = sqlx::query_file!(
            "sql/entries/insert_history.sql",
            entry_effect_id,
            entry_id,
            key,
            previous_key,
            action.as_str(),
        )
        .execute(&mut **db)
        .await?;
        if result.rows_affected() == 0 {
            return Err(ModelError::NotFound("Entry Effect"));
        }
        Ok(())
    }

    pub async fn list_by_scope<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        scope_id: Uuid,
        entry_id: Option<Uuid>,
    ) -> Result<Vec<Self>, ModelError> {
        sqlx::query_file_as!(EntryHistory, "sql/entries/history.sql", scope_id, entry_id)
            .fetch_all(db)
            .await
            .map_err(Into::into)
    }

    pub async fn list_by_effects<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        entry_effect_ids: &[Uuid],
    ) -> Result<Vec<Self>, ModelError> {
        sqlx::query_file_as!(
            EntryHistory,
            "sql/entries/history_by_effects.sql",
            entry_effect_ids,
        )
        .fetch_all(db)
        .await
        .map_err(Into::into)
    }
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(
    tag = "action",
    rename_all = "SCREAMING_SNAKE_CASE",
    rename_all_fields = "camelCase"
)]
pub enum EntryComponentMutation {
    Set {
        component_type: String,
        expected_version: Option<Uuid>,
        #[serde(default)]
        schema_version: Option<i32>,
        data: serde_json::Value,
    },
    Remove {
        component_type: String,
        expected_version: Uuid,
    },
}

impl EntryComponentMutation {
    fn component_type(&self) -> &str {
        match self {
            Self::Set { component_type, .. } | Self::Remove { component_type, .. } => {
                component_type
            }
        }
    }
}

impl Entry {
    pub async fn apply_component_mutations(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        entry_id: Uuid,
        changes: &[EntryComponentMutation],
    ) -> Result<Vec<EntryComponentChange>, ModelError> {
        if changes.is_empty() {
            return Err(ValidationFailed("At least one component change is required.").into());
        }
        let mut component_types = std::collections::HashSet::with_capacity(changes.len());
        for change in changes {
            let component_type = change.component_type();
            validate_component_type(component_type)?;
            if let EntryComponentMutation::Set {
                schema_version: Some(schema_version),
                ..
            } = change
                && *schema_version <= 0
            {
                return Err(ValidationFailed("Component schema version must be positive.").into());
            }
            if !component_types.insert(component_type) {
                return Err(ValidationFailed(
                    "Each component type may only appear once in a batch.",
                )
                .into());
            }
        }

        let mut history_changes = Vec::with_capacity(changes.len());
        for change in changes {
            match change {
                EntryComponentMutation::Set {
                    component_type,
                    expected_version: None,
                    schema_version,
                    data,
                } => {
                    let schema_version = sqlx::query_file_scalar!(
                        "sql/entries/create_component.sql",
                        entry_id,
                        component_type,
                        data,
                        schema_version.as_ref()
                    )
                    .fetch_optional(&mut **db)
                    .await?;
                    let Some(schema_version) = schema_version else {
                        return Err(ModelError::Conflict("EntryComponent".to_string()));
                    };
                    history_changes.push(EntryComponentChange {
                        component_type: component_type.clone(),
                        action: EntryComponentHistoryAction::Set,
                        data: Some(data.clone()),
                        schema_version: Some(schema_version),
                    });
                }
                EntryComponentMutation::Set {
                    component_type,
                    expected_version: Some(expected_version),
                    schema_version,
                    data,
                } => {
                    let schema_version = sqlx::query_file_scalar!(
                        "sql/entries/update_component.sql",
                        entry_id,
                        component_type,
                        expected_version,
                        data,
                        schema_version.as_ref()
                    )
                    .fetch_optional(&mut **db)
                    .await?;
                    let Some(schema_version) = schema_version else {
                        return Err(ModelError::Conflict("EntryComponent".to_string()));
                    };
                    history_changes.push(EntryComponentChange {
                        component_type: component_type.clone(),
                        action: EntryComponentHistoryAction::Set,
                        data: Some(data.clone()),
                        schema_version: Some(schema_version),
                    });
                }
                EntryComponentMutation::Remove {
                    component_type,
                    expected_version,
                } => {
                    let result = sqlx::query_file!(
                        "sql/entries/remove_component.sql",
                        entry_id,
                        component_type,
                        expected_version
                    )
                    .execute(&mut **db)
                    .await?;
                    if result.rows_affected() == 0 {
                        return Err(ModelError::Conflict("EntryComponent".to_string()));
                    }
                    history_changes.push(EntryComponentChange {
                        component_type: component_type.clone(),
                        action: EntryComponentHistoryAction::Remove,
                        data: None,
                        schema_version: None,
                    });
                }
            }
        }
        Ok(history_changes)
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, specta::Type, sqlx::Type)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[sqlx(
    type_name = "entry_component_history_action",
    rename_all = "PascalCase"
)]
pub enum EntryComponentHistoryAction {
    Set,
    Remove,
}

impl EntryComponentHistoryAction {
    fn as_str(self) -> &'static str {
        match self {
            Self::Set => "Set",
            Self::Remove => "Remove",
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct EntryComponentChange {
    pub component_type: String,
    pub action: EntryComponentHistoryAction,
    pub data: Option<serde_json::Value>,
    pub schema_version: Option<i32>,
}

pub fn components_as_set_changes(
    components: &BTreeMap<String, EntryComponent>,
) -> Vec<EntryComponentChange> {
    components
        .iter()
        .map(|(component_type, component)| EntryComponentChange {
            component_type: component_type.clone(),
            action: EntryComponentHistoryAction::Set,
            data: Some(component.data.clone()),
            schema_version: Some(component.schema_version),
        })
        .collect()
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct EntryComponentHistory {
    pub entry_effect_id: Uuid,
    pub operator_id: Option<Uuid>,
    pub scope_id: Uuid,
    pub entry_id: Uuid,
    pub key: String,
    pub component_type: String,
    pub action: EntryComponentHistoryAction,
    pub data: Option<serde_json::Value>,
    pub schema_version: Option<i32>,
    pub created: DateTime<Utc>,
}

impl EntryComponentHistory {
    #[allow(clippy::too_many_arguments)]
    pub async fn record(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        entry_effect_id: Uuid,
        entry_id: Uuid,
        key: &str,
        changes: &[EntryComponentChange],
    ) -> Result<(), ModelError> {
        let key = normalize_ident(key)?.to_lowercase();
        for change in changes {
            let result = sqlx::query_file!(
                "sql/entries/insert_component_history.sql",
                entry_effect_id,
                entry_id,
                key,
                change.component_type,
                change.action.as_str(),
                change.data,
                change.schema_version,
            )
            .execute(&mut **db)
            .await?;
            if result.rows_affected() == 0 {
                return Err(ModelError::NotFound("Entry Effect"));
            }
        }
        Ok(())
    }

    pub async fn list_by_entry<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        scope_id: Uuid,
        entry_id: Uuid,
    ) -> Result<Vec<Self>, ModelError> {
        sqlx::query_file_as!(
            EntryComponentHistory,
            "sql/entries/component_history.sql",
            scope_id,
            entry_id
        )
        .fetch_all(db)
        .await
        .map_err(Into::into)
    }

    pub async fn list_by_key<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        scope_id: Uuid,
        key: &str,
    ) -> Result<Vec<Self>, ModelError> {
        let key = normalize_ident(key)?.to_lowercase();
        sqlx::query_file_as!(
            EntryComponentHistory,
            "sql/entries/component_history_by_key.sql",
            scope_id,
            key
        )
        .fetch_all(db)
        .await
        .map_err(Into::into)
    }

    pub async fn list_by_effects<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        entry_effect_ids: &[Uuid],
    ) -> Result<Vec<Self>, ModelError> {
        sqlx::query_file_as!(
            EntryComponentHistory,
            "sql/entries/component_history_by_effects.sql",
            entry_effect_ids,
        )
        .fetch_all(db)
        .await
        .map_err(Into::into)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct EntryEffectHistory {
    #[serde(flatten)]
    pub effect: EntryEffect,
    pub entry_history: Vec<EntryHistory>,
    pub component_history: Vec<EntryComponentHistory>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::notes::Note;
    use crate::scopes::models::{Scope, ScopeKind};
    use crate::spaces::{AccessPolicy, Space};
    use crate::users::User;
    use serde_json::json;
    use shared_types::messages::Entities;

    fn components<const N: usize>(
        values: [(&str, serde_json::Value); N],
    ) -> BTreeMap<String, serde_json::Value> {
        values
            .into_iter()
            .map(|(component_type, data)| (component_type.to_string(), data))
            .collect()
    }

    async fn user(pool: &sqlx::PgPool) -> User {
        let raw = Uuid::new_v4().simple().to_string();
        User::register(
            pool,
            &format!("scope_{raw}@example.com"),
            &format!("scope_{}", &raw[..8]),
            "Scope Tester",
            "ScopePass123!",
        )
        .await
        .expect("create user failed")
    }

    #[test]
    fn component_types_use_canonical_namespaces() {
        for component_type in [
            "core/counter",
            "dnd5e/spell-slot",
            "com.example.plugin/custom_state",
            "system2/value.v2",
        ] {
            assert_eq!(validate_component_type(component_type), Ok(()));
        }

        for component_type in [
            "counter",
            "Core/counter",
            "core/Counter",
            "core//counter",
            "/core/counter",
            "core/counter/",
            "core/-counter",
            "core/counter-",
            "core/counter name",
            "core/counter\n",
            "核心/计数器",
        ] {
            assert!(
                validate_component_type(component_type).is_err(),
                "{component_type} should be invalid"
            );
        }

        assert_eq!(
            validate_component_type(&format!("example/{}", "a".repeat(192))),
            Ok(())
        );
        assert!(validate_component_type(&format!("example/{}", "a".repeat(193))).is_err());
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_entry_identifier_revision_and_history_identity(pool: sqlx::PgPool) {
        let user = user(&pool).await;
        let space = Space::create(
            &pool,
            format!("scope_{}", &Uuid::new_v4().simple().to_string()[..8]),
            &user.id,
            "scope test".to_string(),
            None,
            Some("d20"),
        )
        .await
        .expect("create space failed");
        let space_scope = Scope::get_by_id(&pool, space.scope_id)
            .await
            .expect("get scope failed")
            .expect("space scope missing");
        assert_ne!(space_scope.id, space.id);
        assert_eq!(space_scope.kind, ScopeKind::Space);
        assert_eq!(space_scope.owner_id, Some(user.id));
        assert_eq!(space_scope.access_policy, AccessPolicy::Public);
        assert_eq!(space_scope.access_channel_id, None);

        let mut transaction = pool.begin().await.expect("begin failed");
        let note = Note::create(
            &mut transaction,
            space.id,
            "Archived reference".to_string(),
            Vec::new(),
            Vec::new(),
            user.id,
            "This remains a weak reference.".to_string(),
            Entities::default(),
            AccessPolicy::Secret,
            None,
        )
        .await
        .expect("create reference note failed");
        assert!(
            Note::archive(&mut transaction, space.id, note.id, note.revision)
                .await
                .expect("archive reference note failed")
        );
        let entry = Entry::create(
            &mut transaction,
            space_scope.id,
            " HP ".to_string(),
            vec![" Health ".to_string()],
            "Hit points".to_string(),
            Some(note.id),
            components([("core/counter", json!({"value": 10}))]),
            vec![" Resource ".to_string(), "resource".to_string()],
            0,
        )
        .await
        .expect("create entry failed");
        assert_eq!(entry.key, "HP");
        assert_eq!(entry.aliases.as_ref(), [CompactString::new("Health")]);
        assert_eq!(
            entry.tags.as_ref(),
            [
                CompactString::new("Resource"),
                CompactString::new("resource")
            ]
        );
        let create_effect =
            EntryEffect::create(&mut transaction, space.id, space_scope.id, user.id)
                .await
                .expect("create Entry Effect failed");
        EntryHistory::record(
            &mut transaction,
            create_effect.id,
            entry.id,
            &entry.key,
            EntryHistoryAction::Create,
        )
        .await
        .expect("create entry history failed");
        EntryComponentHistory::record(
            &mut transaction,
            create_effect.id,
            entry.id,
            &entry.key,
            &components_as_set_changes(&entry.components),
        )
        .await
        .expect("create history failed");
        transaction.commit().await.expect("commit failed");

        let invalid_component = sqlx::query(
            "INSERT INTO entry_components (entry_id, component_type, data) VALUES ($1, $2, $3)",
        )
        .bind(entry.id)
        .bind("Invalid/type")
        .bind(json!({}))
        .execute(&pool)
        .await;
        assert!(
            matches!(invalid_component, Err(sqlx::Error::Database(_))),
            "the database must reject non-canonical component types"
        );

        let mut transaction = pool.begin().await.expect("begin failed");
        let conflict = Entry::create(
            &mut transaction,
            space_scope.id,
            "health".to_string(),
            Vec::new(),
            "Conflict".to_string(),
            None,
            components([("core/counter", json!({"value": 1}))]),
            vec![],
            1,
        )
        .await;
        assert!(matches!(conflict, Err(ModelError::Conflict(_))));
        transaction.rollback().await.expect("rollback failed");

        let mut transaction = pool.begin().await.expect("begin failed");
        let stale_update = Entry::update(
            &mut transaction,
            entry.scope_id,
            entry.id,
            Uuid::new_v4(),
            entry.key.to_string(),
            entry.aliases.iter().map(ToString::to_string).collect(),
            entry.display_name.to_string(),
            entry.reference_note_id,
            entry.tags.iter().map(ToString::to_string).collect(),
            entry.sort,
        )
        .await
        .expect("stale update failed");
        assert!(stale_update.is_none());
        transaction.rollback().await.expect("rollback failed");

        let mut transaction = pool.begin().await.expect("begin failed");
        let updated = Entry::update(
            &mut transaction,
            entry.scope_id,
            entry.id,
            entry.metadata_version,
            entry.key.to_string(),
            entry.aliases.iter().map(ToString::to_string).collect(),
            entry.display_name.to_string(),
            entry.reference_note_id,
            vec!["State".to_string()],
            entry.sort,
        )
        .await
        .expect("update failed")
        .expect("entry missing");
        transaction.commit().await.expect("commit failed");
        assert_ne!(updated.metadata_version, entry.metadata_version);
        assert_eq!(
            updated.components["core/counter"].data,
            json!({"value": 10})
        );
        assert_eq!(updated.components["core/counter"].schema_version, 1);
        assert_eq!(updated.tags.as_ref(), [CompactString::new("State")]);

        let metadata_version = updated.metadata_version;
        let core_version = updated.components["core/counter"].version;
        let mut transaction = pool.begin().await.expect("begin failed");
        let effect = EntryEffect::create(&mut transaction, space.id, space_scope.id, user.id)
            .await
            .expect("create component Entry Effect failed");
        let changes = Entry::apply_component_mutations(
            &mut transaction,
            updated.id,
            &[
                EntryComponentMutation::Set {
                    component_type: "example/custom".to_string(),
                    expected_version: None,
                    schema_version: Some(2),
                    data: json!({"anything": true}),
                },
                EntryComponentMutation::Remove {
                    component_type: "core/counter".to_string(),
                    expected_version: core_version,
                },
            ],
        )
        .await
        .expect("component batch failed");
        EntryComponentHistory::record(
            &mut transaction,
            effect.id,
            updated.id,
            &updated.key,
            &changes,
        )
        .await
        .expect("record component batch failed");
        transaction.commit().await.expect("commit failed");

        let updated = Entry::get_by_id(&pool, space_scope.id, entry.id)
            .await
            .expect("entry lookup failed")
            .expect("entry missing");
        assert_eq!(updated.metadata_version, metadata_version);
        assert!(!updated.components.contains_key("core/counter"));
        assert_eq!(
            updated.components["example/custom"].data,
            json!({"anything": true})
        );
        assert_eq!(updated.components["example/custom"].schema_version, 2);
        let custom_version = updated.components["example/custom"].version;

        let mut transaction = pool.begin().await.expect("begin failed");
        let changes = Entry::apply_component_mutations(
            &mut transaction,
            updated.id,
            &[EntryComponentMutation::Set {
                component_type: "example/custom".to_string(),
                expected_version: Some(custom_version),
                schema_version: None,
                data: json!({"anything": "updated"}),
            }],
        )
        .await
        .expect("component update failed");
        let update_effect =
            EntryEffect::create(&mut transaction, space.id, space_scope.id, user.id)
                .await
                .expect("create update Entry Effect failed");
        EntryComponentHistory::record(
            &mut transaction,
            update_effect.id,
            updated.id,
            &updated.key,
            &changes,
        )
        .await
        .expect("record component update failed");
        transaction.commit().await.expect("commit failed");

        let after_component_update = Entry::get_by_id(&pool, space_scope.id, entry.id)
            .await
            .expect("entry lookup failed")
            .expect("entry missing");
        assert_eq!(
            after_component_update.components["example/custom"].schema_version, 2,
            "omitting schemaVersion must preserve the stored format version"
        );
        let mut transaction = pool.begin().await.expect("begin failed");
        let conflict = Entry::apply_component_mutations(
            &mut transaction,
            updated.id,
            &[
                EntryComponentMutation::Set {
                    component_type: "example/custom".to_string(),
                    expected_version: Some(
                        after_component_update.components["example/custom"].version,
                    ),
                    schema_version: Some(3),
                    data: json!({"anything": false}),
                },
                EntryComponentMutation::Remove {
                    component_type: "example/missing".to_string(),
                    expected_version: Uuid::new_v4(),
                },
            ],
        )
        .await;
        assert!(matches!(conflict, Err(ModelError::Conflict(_))));
        transaction.rollback().await.expect("rollback failed");
        let after_rollback = Entry::get_by_id(&pool, space_scope.id, entry.id)
            .await
            .expect("entry lookup failed")
            .expect("entry missing");
        assert_eq!(
            after_rollback.components["example/custom"].data,
            json!({"anything": "updated"})
        );
        assert_eq!(
            after_rollback.components["example/custom"].version,
            after_component_update.components["example/custom"].version,
            "a conflict must roll back the whole component batch"
        );

        let mut transaction = pool.begin().await.expect("begin failed");
        sqlx::query("DELETE FROM notes WHERE id = $1")
            .bind(note.id)
            .execute(&mut *transaction)
            .await
            .expect("delete reference note failed");
        transaction.commit().await.expect("commit failed");
        let detached = Entry::get_by_id(&pool, space_scope.id, entry.id)
            .await
            .expect("entry lookup failed")
            .expect("entry missing");
        assert_eq!(detached.reference_note_id, None);

        let mut transaction = pool.begin().await.expect("begin failed");
        let renamed = Entry::update(
            &mut transaction,
            detached.scope_id,
            detached.id,
            detached.metadata_version,
            "stamina".to_string(),
            detached.aliases.iter().map(ToString::to_string).collect(),
            detached.display_name.to_string(),
            detached.reference_note_id,
            detached.tags.iter().map(ToString::to_string).collect(),
            detached.sort,
        )
        .await
        .expect("rename failed")
        .expect("entry missing");
        let rename_effect =
            EntryEffect::create(&mut transaction, space.id, space_scope.id, user.id)
                .await
                .expect("create rename Entry Effect failed");
        EntryHistory::record_rename(
            &mut transaction,
            rename_effect.id,
            renamed.id,
            &detached.key,
            &renamed.key,
        )
        .await
        .expect("record rename history failed");
        transaction.commit().await.expect("commit failed");

        let mut transaction = pool.begin().await.expect("begin failed");
        assert!(
            !Entry::delete(
                &mut transaction,
                renamed.scope_id,
                renamed.id,
                Uuid::new_v4()
            )
            .await
            .expect("stale delete failed")
        );
        let delete_effect =
            EntryEffect::create(&mut transaction, space.id, space_scope.id, user.id)
                .await
                .expect("create delete Entry Effect failed");
        EntryHistory::record(
            &mut transaction,
            delete_effect.id,
            renamed.id,
            &renamed.key,
            EntryHistoryAction::Delete,
        )
        .await
        .expect("delete entry history failed");
        assert!(
            Entry::delete(
                &mut transaction,
                renamed.scope_id,
                renamed.id,
                renamed.metadata_version
            )
            .await
            .expect("delete failed")
        );
        transaction.commit().await.expect("commit failed");

        assert!(
            Entry::get_by_id(&pool, space_scope.id, updated.id)
                .await
                .expect("deleted entry lookup failed")
                .is_none()
        );
        assert!(
            EntryMetadata::list_by_scope(&pool, space_scope.id)
                .await
                .expect("entry list failed")
                .is_empty()
        );

        let mut transaction = pool.begin().await.expect("begin failed");
        let replacement = Entry::create(
            &mut transaction,
            space_scope.id,
            "hp".to_string(),
            Vec::new(),
            "Replacement hit points".to_string(),
            None,
            components([("core/counter", json!({"value": 12}))]),
            Vec::new(),
            0,
        )
        .await
        .expect("create replacement failed");
        let replacement_effect =
            EntryEffect::create(&mut transaction, space.id, space_scope.id, user.id)
                .await
                .expect("create replacement Entry Effect failed");
        EntryHistory::record(
            &mut transaction,
            replacement_effect.id,
            replacement.id,
            &replacement.key,
            EntryHistoryAction::Create,
        )
        .await
        .expect("record replacement entry history failed");
        EntryComponentHistory::record(
            &mut transaction,
            replacement_effect.id,
            replacement.id,
            &replacement.key,
            &components_as_set_changes(&replacement.components),
        )
        .await
        .expect("record replacement history failed");
        transaction.commit().await.expect("commit failed");
        assert_ne!(replacement.id, updated.id);

        let history = EntryComponentHistory::list_by_entry(&pool, space_scope.id, updated.id)
            .await
            .expect("history failed");
        assert_eq!(history.len(), 4);
        assert!(history.iter().all(|row| row.entry_id == updated.id));
        assert!(history.iter().all(|row| row.key == "hp"));

        let replacement_history =
            EntryComponentHistory::list_by_entry(&pool, space_scope.id, replacement.id)
                .await
                .expect("replacement history failed");
        assert_eq!(replacement_history.len(), 1);
        assert!(
            replacement_history
                .iter()
                .all(|row| row.entry_id == replacement.id)
        );
        let key_history = EntryComponentHistory::list_by_key(&pool, space_scope.id, " HP ")
            .await
            .expect("history by key failed");
        assert_eq!(key_history.len(), 5);
        assert!(key_history.iter().any(|row| row.entry_id == updated.id));
        assert!(key_history.iter().any(|row| row.entry_id == replacement.id));
        assert!(key_history.iter().all(|row| row.key == "hp"));
        assert!(history.iter().any(|row| {
            row.component_type == "core/counter"
                && row.action == EntryComponentHistoryAction::Set
                && row.data == Some(json!({"value": 10}))
                && row.schema_version == Some(1)
        }));
        assert!(history.iter().any(|row| {
            row.component_type == "core/counter"
                && row.action == EntryComponentHistoryAction::Remove
                && row.data.is_none()
                && row.schema_version.is_none()
        }));
        assert!(history.iter().any(|row| {
            row.component_type == "example/custom"
                && row.action == EntryComponentHistoryAction::Set
                && row.data == Some(json!({"anything": "updated"}))
                && row.schema_version == Some(2)
        }));

        let entry_history = EntryHistory::list_by_scope(&pool, space_scope.id, None)
            .await
            .expect("entry history failed");
        assert_eq!(entry_history.len(), 4);
        assert!(entry_history.iter().any(|row| {
            row.entry_id == updated.id
                && row.entry_effect_id == create_effect.id
                && row.action == EntryHistoryAction::Create
        }));
        assert!(entry_history.iter().any(|row| {
            row.entry_id == renamed.id
                && row.entry_effect_id == rename_effect.id
                && row.action == EntryHistoryAction::Rename
                && row.previous_key.as_deref() == Some("hp")
                && row.key == "stamina"
        }));
        assert!(entry_history.iter().any(|row| {
            row.entry_id == updated.id
                && row.entry_effect_id == delete_effect.id
                && row.action == EntryHistoryAction::Delete
        }));
        assert!(entry_history.iter().any(|row| {
            row.entry_id == replacement.id
                && row.entry_effect_id == replacement_effect.id
                && row.action == EntryHistoryAction::Create
        }));

        let effects = EntryEffect::list_by_ids(
            &pool,
            space.id,
            &[create_effect.id, replacement_effect.id, Uuid::new_v4()],
        )
        .await
        .expect("list Entry Effects failed");
        assert_eq!(effects.len(), 2);
        assert!(effects.iter().all(|effect| {
            effect.space_id == space.id
                && effect.scope_id == space_scope.id
                && effect.operator_id == Some(user.id)
        }));
        let effect_entry_history =
            EntryHistory::list_by_effects(&pool, &[create_effect.id, replacement_effect.id])
                .await
                .expect("list Entry History by Effect failed");
        assert_eq!(effect_entry_history.len(), 2);
        let effect_component_history = EntryComponentHistory::list_by_effects(
            &pool,
            &[create_effect.id, replacement_effect.id],
        )
        .await
        .expect("list Component History by Effect failed");
        assert_eq!(effect_component_history.len(), 2);
    }
}
