use chrono::{DateTime, Utc};
use compact_str::CompactString;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use std::ops::Deref;
use uuid::Uuid;

use crate::characters::{normalize_aliases, normalize_ident};
use crate::error::{ModelError, ValidationFailed};

pub(crate) const CORE_PORTRAIT_COMPONENT_TYPE: &str = "core/portrait";
// This is intentionally a soft limit. A rare concurrent overage is acceptable.
const MAX_PORTRAIT_COMPONENTS_PER_SCOPE: i64 = 6;
const PORTRAIT_COMPONENT_LIMIT_ERROR: &str =
    "A Scope may contain at most 6 core/portrait Components.";

#[derive(Debug, Clone, Copy, PartialEq, Eq, sqlx::Type)]
#[sqlx(type_name = "entry_component_payload_type", rename_all = "PascalCase")]
pub(crate) enum EntryComponentPayloadType {
    Json,
    Asset,
}

impl EntryComponentPayloadType {
    fn as_str(self) -> &'static str {
        match self {
            Self::Json => "JSON",
            Self::Asset => "ASSET",
        }
    }
}

#[derive(Debug, Clone, sqlx::FromRow)]
struct EntryComponentJoinedRow {
    component_type: CompactString,
    payload_type: EntryComponentPayloadType,
    json_data: Option<Value>,
    json_schema_version: Option<i32>,
    asset_id: Option<Uuid>,
    version: Uuid,
    modified: DateTime<Utc>,
}

#[derive(Debug, Clone, sqlx::FromRow)]
struct EntryComponentMatchRow {
    id: Uuid,
    scope_id: Uuid,
    key: CompactString,
    aliases: Vec<CompactString>,
    display_name: CompactString,
    reference_note_id: Option<Uuid>,
    tags: Vec<CompactString>,
    pos_p: i32,
    pos_q: i32,
    pos: f64,
    metadata_version: Uuid,
    created: DateTime<Utc>,
    entry_modified: DateTime<Utc>,
    component_type: CompactString,
    payload_type: EntryComponentPayloadType,
    json_data: Option<Value>,
    json_schema_version: Option<i32>,
    asset_id: Option<Uuid>,
    component_version: Uuid,
    component_modified: DateTime<Utc>,
}

#[derive(Debug, Clone, sqlx::FromRow)]
struct EntryComponentForUpdateRow {
    payload_type: EntryComponentPayloadType,
    version: Uuid,
    schema_version: Option<i32>,
    json_exists: bool,
    asset_exists: bool,
}

impl EntryComponentForUpdateRow {
    fn has_payload(&self) -> bool {
        match self.payload_type {
            EntryComponentPayloadType::Json => self.json_exists,
            EntryComponentPayloadType::Asset => self.asset_exists,
        }
    }

    fn has_json_payload(&self) -> bool {
        self.payload_type == EntryComponentPayloadType::Json && self.json_exists
    }

    fn has_asset_payload(&self) -> bool {
        self.payload_type == EntryComponentPayloadType::Asset && self.asset_exists
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    #[serde(flatten)]
    pub metadata: EntryMetadata,
    pub components: BTreeMap<String, EntryComponent>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct EntryComponentMatch {
    #[serde(flatten)]
    pub metadata: EntryMetadata,
    #[specta(type = String)]
    pub component_type: CompactString,
    pub component: EntryComponent,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, specta::Type, sqlx::FromRow)]
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
    pub pos_p: i32,
    pub pos_q: i32,
    pub pos: f64,
    pub metadata_version: Uuid,
    pub created: DateTime<Utc>,
    pub modified: DateTime<Utc>,
}

#[derive(Debug)]
pub(crate) struct CachedEntryComponents {
    components: Box<[(CompactString, EntryComponent)]>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, specta::Type)]
#[serde(
    tag = "payloadType",
    rename_all = "SCREAMING_SNAKE_CASE",
    rename_all_fields = "camelCase"
)]
pub enum EntryComponent {
    Json {
        data: Value,
        schema_version: i32,
        version: Uuid,
        modified: DateTime<Utc>,
    },
    Asset {
        asset_id: Uuid,
        version: Uuid,
        modified: DateTime<Utc>,
    },
}

impl EntryComponent {
    fn history_payload(&self) -> Value {
        match self {
            Self::Json {
                data,
                schema_version,
                ..
            } => json_component_history_payload(data, *schema_version),
            Self::Asset { asset_id, .. } => asset_component_history_payload(*asset_id),
        }
    }

    #[cfg(test)]
    pub(crate) fn json_data(&self) -> serde_json::Value {
        match self {
            Self::Json { data, .. } => data.clone(),
            Self::Asset { .. } => panic!("expected a JSON Entry Component"),
        }
    }

    #[cfg(test)]
    pub(crate) fn schema_version(&self) -> i32 {
        match self {
            Self::Json { schema_version, .. } => *schema_version,
            Self::Asset { .. } => panic!("expected a JSON Entry Component"),
        }
    }

    #[cfg(test)]
    pub(crate) fn version(&self) -> Uuid {
        match self {
            Self::Json { version, .. } | Self::Asset { version, .. } => *version,
        }
    }
}

fn json_component_history_payload(data: &Value, schema_version: i32) -> Value {
    serde_json::json!({
        "payloadType": "JSON",
        "schemaVersion": schema_version,
        "data": data,
    })
}

fn asset_component_history_payload(asset_id: Uuid) -> Value {
    serde_json::json!({
        "payloadType": "ASSET",
        "assetId": asset_id,
    })
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, specta::Type, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct EntryEffect {
    pub id: Uuid,
    pub space_id: Uuid,
    pub scope_id: Uuid,
    pub operator_id: Option<Uuid>,
    pub created: DateTime<Utc>,
    pub message_id: Option<Uuid>,
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

    pub async fn list_by_message_ids<'c, T: sqlx::PgExecutor<'c>>(
        db: T,
        space_id: Uuid,
        message_ids: &[Uuid],
    ) -> Result<Vec<Self>, sqlx::Error> {
        sqlx::query_file_as!(
            EntryEffect,
            "sql/entries/list_effects_by_messages.sql",
            space_id,
            message_ids,
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

impl EntryComponentJoinedRow {
    fn into_response(self, entry_id: Uuid) -> Option<(CompactString, EntryComponent)> {
        let component = match self.payload_type {
            EntryComponentPayloadType::Json => {
                let (Some(data), Some(schema_version)) = (self.json_data, self.json_schema_version)
                else {
                    report_missing_component_payload(
                        entry_id,
                        &self.component_type,
                        self.payload_type,
                    );
                    return None;
                };
                EntryComponent::Json {
                    data,
                    schema_version,
                    version: self.version,
                    modified: self.modified,
                }
            }
            EntryComponentPayloadType::Asset => {
                let Some(asset_id) = self.asset_id else {
                    report_missing_component_payload(
                        entry_id,
                        &self.component_type,
                        self.payload_type,
                    );
                    return None;
                };
                EntryComponent::Asset {
                    asset_id,
                    version: self.version,
                    modified: self.modified,
                }
            }
        };
        Some((self.component_type, component))
    }
}

impl EntryComponentMatchRow {
    fn into_response(self) -> Option<EntryComponentMatch> {
        let entry_id = self.id;
        let (component_type, component) = EntryComponentJoinedRow {
            component_type: self.component_type,
            payload_type: self.payload_type,
            json_data: self.json_data,
            json_schema_version: self.json_schema_version,
            asset_id: self.asset_id,
            version: self.component_version,
            modified: self.component_modified,
        }
        .into_response(entry_id)?;
        Some(EntryComponentMatch {
            metadata: EntryMetadata {
                id: entry_id,
                scope_id: self.scope_id,
                key: self.key,
                aliases: self.aliases,
                display_name: self.display_name,
                reference_note_id: self.reference_note_id,
                tags: self.tags,
                pos_p: self.pos_p,
                pos_q: self.pos_q,
                pos: self.pos,
                metadata_version: self.metadata_version,
                created: self.created,
                modified: self.entry_modified,
            },
            component_type,
            component,
        })
    }
}

impl CachedEntryComponents {
    pub(crate) async fn load(db: &sqlx::PgPool, entry_id: Uuid) -> Result<Self, sqlx::Error> {
        let rows = sqlx::query_file_as!(
            EntryComponentJoinedRow,
            "sql/entries/get_components.sql",
            entry_id
        )
        .fetch_all(db)
        .await?;
        let components = rows
            .into_iter()
            .filter_map(|row| row.into_response(entry_id))
            .collect();
        Ok(Self { components })
    }

    pub(crate) fn to_response(&self) -> BTreeMap<String, EntryComponent> {
        self.components
            .iter()
            .map(|(component_type, component)| (component_type.to_string(), component.clone()))
            .collect()
    }
}

fn validate_components(
    components: &BTreeMap<String, EntryComponentPayloadInput>,
) -> Result<(), ValidationFailed> {
    for (component_type, payload) in components {
        validate_component_type(component_type)?;
        validate_component_payload(component_type, payload)?;
    }
    Ok(())
}

fn validate_component_payload(
    component_type: &str,
    payload: &EntryComponentPayloadInput,
) -> Result<(), ValidationFailed> {
    if component_type == CORE_PORTRAIT_COMPONENT_TYPE
        && !matches!(payload, EntryComponentPayloadInput::Asset { .. })
    {
        return Err(ValidationFailed(
            "A core/portrait Component requires an Asset payload.",
        ));
    }
    payload.validate()
}

fn validate_component_type(component_type: &str) -> Result<(), ValidationFailed> {
    // Component types are namespaced identifiers. By convention, `core/` is
    // reserved for built-in components; ownership is not enforced yet.
    crate::validators::NAMESPACED_TYPE.run(component_type)
}

fn components_from_rows(
    entry_id: Uuid,
    rows: impl IntoIterator<Item = EntryComponentJoinedRow>,
) -> BTreeMap<String, EntryComponent> {
    rows.into_iter()
        .filter_map(|row| row.into_response(entry_id))
        .map(|(component_type, component)| (component_type.to_string(), component))
        .collect()
}

fn report_missing_component_payload(
    entry_id: Uuid,
    component_type: &str,
    payload_type: EntryComponentPayloadType,
) {
    metrics::counter!(
        "boluo_server_entry_component_integrity_error_total",
        "payload_type" => payload_type.as_str()
    )
    .increment(1);
    tracing::warn!(
        %entry_id,
        component_type,
        payload_type = payload_type.as_str(),
        "Entry Component payload is missing; omitting the Component"
    );
}

async fn insert_components(
    db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    entry_id: Uuid,
    components: &BTreeMap<String, EntryComponentPayloadInput>,
) -> Result<(), ModelError> {
    for (component_type, payload) in components {
        match payload {
            EntryComponentPayloadInput::Json {
                schema_version,
                data,
            } => {
                sqlx::query_file_scalar!(
                    "sql/entries/insert_json_component.sql",
                    entry_id,
                    component_type,
                    data,
                    schema_version.as_ref(),
                )
                .fetch_one(&mut **db)
                .await?;
            }
            EntryComponentPayloadInput::Asset { asset_id } => {
                let inserted = sqlx::query_file_scalar!(
                    "sql/entries/insert_asset_component.sql",
                    entry_id,
                    component_type,
                    asset_id,
                )
                .fetch_optional(&mut **db)
                .await?;
                if inserted.is_none() {
                    return Err(ModelError::NotFound("Asset"));
                }
            }
        }
    }
    Ok(())
}

async fn validate_asset_component(
    db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    component_type: &str,
    asset_id: Uuid,
) -> Result<(), ModelError> {
    if component_type != CORE_PORTRAIT_COMPONENT_TYPE {
        return Ok(());
    }
    let mime_type =
        sqlx::query_file_scalar!("sql/entries/get_portrait_asset_mime_type.sql", asset_id,)
            .fetch_optional(&mut **db)
            .await?
            .ok_or(ModelError::NotFound("Asset"))?;
    if !mime_type.starts_with("image/") {
        return Err(
            ValidationFailed("A core/portrait Component must reference an image Asset.").into(),
        );
    }
    Ok(())
}

async fn validate_portrait_capacity(
    db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    scope_id: Uuid,
) -> Result<(), ModelError> {
    let has_capacity = sqlx::query_file_scalar!(
        "sql/entries/validate_portrait_capacity.sql",
        scope_id,
        MAX_PORTRAIT_COMPONENTS_PER_SCOPE,
        CORE_PORTRAIT_COMPONENT_TYPE,
    )
    .fetch_optional(&mut **db)
    .await?
    .ok_or(ModelError::NotFound("Scope"))?;
    if !has_capacity {
        return Err(ValidationFailed(PORTRAIT_COMPONENT_LIMIT_ERROR).into());
    }
    Ok(())
}

async fn validate_portrait_capacity_by_entry(
    db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    entry_id: Uuid,
) -> Result<(), ModelError> {
    let has_capacity = sqlx::query_file_scalar!(
        "sql/entries/validate_portrait_capacity_by_entry.sql",
        entry_id,
        MAX_PORTRAIT_COMPONENTS_PER_SCOPE,
        CORE_PORTRAIT_COMPONENT_TYPE,
    )
    .fetch_optional(&mut **db)
    .await?
    .ok_or(ModelError::NotFound("Entry"))?;
    if !has_capacity {
        return Err(ValidationFailed(PORTRAIT_COMPONENT_LIMIT_ERROR).into());
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
    pub async fn first_asset_by_component(
        db: &sqlx::PgPool,
        scope_id: Uuid,
        component_type: &str,
    ) -> Result<Option<Uuid>, ModelError> {
        validate_component_type(component_type)?;
        sqlx::query_file_scalar!(
            "sql/entries/first_asset_by_component.sql",
            scope_id,
            component_type,
        )
        .fetch_optional(db)
        .await
        .map_err(Into::into)
    }

    pub async fn list_by_component(
        db: &sqlx::PgPool,
        scope_id: Uuid,
        component_type: &str,
    ) -> Result<Vec<EntryComponentMatch>, ModelError> {
        validate_component_type(component_type)?;
        let rows = sqlx::query_file_as!(
            EntryComponentMatchRow,
            "sql/entries/list_by_component.sql",
            scope_id,
            component_type,
        )
        .fetch_all(db)
        .await?;
        Ok(rows
            .into_iter()
            .filter_map(EntryComponentMatchRow::into_response)
            .collect())
    }

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
            EntryComponentJoinedRow,
            "sql/entries/get_components.sql",
            entry_id
        )
        .fetch_all(db)
        .await?;
        Ok(Some(entry.with_components(components_from_rows(
            entry_id, components,
        ))))
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
            EntryComponentJoinedRow,
            "sql/entries/get_components.sql",
            entry_id
        )
        .fetch_all(&mut **db)
        .await?;
        Ok(Some(entry.with_components(components_from_rows(
            entry_id, components,
        ))))
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn create(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        scope_id: Uuid,
        key: String,
        aliases: Vec<String>,
        display_name: String,
        reference_note_id: Option<Uuid>,
        components: BTreeMap<String, EntryComponentPayloadInput>,
        tags: Vec<String>,
        before_entry_id: Option<Uuid>,
    ) -> Result<Self, ModelError> {
        let key = normalize_ident(&key)?;
        let aliases = normalize_aliases(aliases, Some(&key))?;
        let display_name = display_name.trim().to_string();
        crate::validators::DISPLAY_NAME.run(&display_name)?;
        validate_components(&components)?;
        for (component_type, payload) in &components {
            if let EntryComponentPayloadInput::Asset { asset_id } = payload {
                validate_asset_component(db, component_type, *asset_id).await?;
            }
        }
        if components.contains_key(CORE_PORTRAIT_COMPONENT_TYPE) {
            validate_portrait_capacity(db, scope_id).await?;
        }
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
            before_entry_id,
        )
        .execute(&mut **db)
        .await?;
        if result.rows_affected() == 0 {
            let scope_exists =
                sqlx::query_scalar::<_, bool>("SELECT EXISTS(SELECT 1 FROM scopes WHERE id = $1)")
                    .bind(scope_id)
                    .fetch_one(&mut **db)
                    .await?;
            return Err(ModelError::NotFound(if scope_exists {
                "Entry"
            } else {
                "Scope"
            }));
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

    pub async fn move_before(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        scope_id: Uuid,
        entry_id: Uuid,
        expected_metadata_version: Uuid,
        before_entry_id: Option<Uuid>,
    ) -> Result<Option<Self>, ModelError> {
        if before_entry_id == Some(entry_id) {
            return Err(ValidationFailed("An Entry cannot be moved before itself.").into());
        }
        let updated_id = sqlx::query_file_scalar!(
            "sql/entries/move_before.sql",
            scope_id,
            entry_id,
            expected_metadata_version,
            before_entry_id,
        )
        .fetch_optional(&mut **db)
        .await?;
        let Some(updated_id) = updated_id else {
            if let Some(before_entry_id) = before_entry_id {
                let before_entry_exists = sqlx::query_scalar::<_, bool>(
                    "SELECT EXISTS(SELECT 1 FROM entries WHERE scope_id = $1 AND id = $2)",
                )
                .bind(scope_id)
                .bind(before_entry_id)
                .fetch_one(&mut **db)
                .await?;
                if !before_entry_exists {
                    return Err(ModelError::NotFound("Entry"));
                }
            }
            return Ok(None);
        };
        Self::get_by_id_in_transaction(db, scope_id, updated_id)
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
        #[serde(flatten)]
        payload: EntryComponentPayloadInput,
    },
    Remove {
        component_type: String,
        expected_version: Option<Uuid>,
    },
}

#[derive(Debug, Clone, Deserialize, specta::Type)]
#[serde(
    tag = "payloadType",
    rename_all = "SCREAMING_SNAKE_CASE",
    rename_all_fields = "camelCase"
)]
pub enum EntryComponentPayloadInput {
    Json {
        #[serde(default)]
        schema_version: Option<i32>,
        data: Value,
    },
    Asset {
        asset_id: Uuid,
    },
}

impl EntryComponentPayloadInput {
    pub(crate) fn json(data: serde_json::Value) -> Self {
        Self::json_with_schema(data, None)
    }

    pub(crate) fn json_with_schema(data: serde_json::Value, schema_version: Option<i32>) -> Self {
        Self::Json {
            schema_version,
            data,
        }
    }

    fn validate(&self) -> Result<(), ValidationFailed> {
        if let Self::Json {
            schema_version: Some(schema_version),
            ..
        } = self
            && *schema_version <= 0
        {
            return Err(ValidationFailed(
                "Component schema version must be positive.",
            ));
        }
        Ok(())
    }
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

fn validate_component_precondition(
    current: Option<&EntryComponentForUpdateRow>,
    expected_version: Option<Uuid>,
) -> Result<(), ModelError> {
    match (current, expected_version) {
        (Some(current), Some(expected_version)) if current.version == expected_version => Ok(()),
        (Some(current), None) if !current.has_payload() => Ok(()),
        (None, None) => Ok(()),
        _ => Err(ModelError::Conflict("EntryComponent".to_string())),
    }
}

impl Entry {
    pub async fn apply_component_mutations(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        entry_id: Uuid,
        changes: &[EntryComponentMutation],
    ) -> Result<EntryComponentMutationResult, ModelError> {
        if changes.is_empty() {
            return Err(ValidationFailed("At least one component change is required.").into());
        }
        let mut component_types = std::collections::HashSet::with_capacity(changes.len());
        for change in changes {
            let component_type = change.component_type();
            validate_component_type(component_type)?;
            if let EntryComponentMutation::Set { payload, .. } = change {
                validate_component_payload(component_type, payload)?;
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
            let component_type = change.component_type();
            let current = sqlx::query_file_as!(
                EntryComponentForUpdateRow,
                "sql/entries/get_component_for_update.sql",
                entry_id,
                component_type,
            )
            .fetch_optional(&mut **db)
            .await?;
            let current_has_json_payload = current
                .as_ref()
                .is_some_and(EntryComponentForUpdateRow::has_json_payload);

            match change {
                EntryComponentMutation::Set {
                    component_type,
                    expected_version,
                    payload,
                } => {
                    validate_component_precondition(current.as_ref(), *expected_version)?;
                    if component_type == CORE_PORTRAIT_COMPONENT_TYPE
                        && !current
                            .as_ref()
                            .is_some_and(EntryComponentForUpdateRow::has_asset_payload)
                    {
                        validate_portrait_capacity_by_entry(db, entry_id).await?;
                    }
                    if let EntryComponentPayloadInput::Asset { asset_id } = payload {
                        validate_asset_component(db, component_type, *asset_id).await?;
                        let valid = sqlx::query_file_scalar!(
                            "sql/entries/validate_component_asset.sql",
                            entry_id,
                            asset_id,
                        )
                        .fetch_one(&mut **db)
                        .await?;
                        if !valid {
                            return Err(ModelError::NotFound("Asset"));
                        }
                    }
                    if current.is_some() {
                        sqlx::query_file!(
                            "sql/entries/remove_component.sql",
                            entry_id,
                            component_type,
                        )
                        .execute(&mut **db)
                        .await?;
                    }

                    match payload {
                        EntryComponentPayloadInput::Json {
                            schema_version,
                            data,
                        } => {
                            let schema_version = schema_version.or_else(|| {
                                current.as_ref().and_then(|current| {
                                    current_has_json_payload
                                        .then_some(current.schema_version)
                                        .flatten()
                                })
                            });
                            let schema_version = sqlx::query_file_scalar!(
                                "sql/entries/insert_json_component.sql",
                                entry_id,
                                component_type,
                                data,
                                schema_version.as_ref(),
                            )
                            .fetch_one(&mut **db)
                            .await?;
                            history_changes.push(EntryComponentHistoryChange::set(
                                component_type,
                                json_component_history_payload(data, schema_version),
                            ));
                        }
                        EntryComponentPayloadInput::Asset { asset_id } => {
                            let inserted = sqlx::query_file_scalar!(
                                "sql/entries/insert_asset_component.sql",
                                entry_id,
                                component_type,
                                asset_id,
                            )
                            .fetch_optional(&mut **db)
                            .await?;
                            if inserted.is_none() {
                                return Err(ModelError::NotFound("Asset"));
                            }
                            history_changes.push(EntryComponentHistoryChange::set(
                                component_type,
                                asset_component_history_payload(*asset_id),
                            ));
                        }
                    }
                }
                EntryComponentMutation::Remove {
                    component_type,
                    expected_version,
                } => {
                    validate_component_precondition(current.as_ref(), *expected_version)?;
                    if current.is_none() {
                        return Err(ModelError::Conflict("EntryComponent".to_string()));
                    }
                    let result = sqlx::query_file!(
                        "sql/entries/remove_component.sql",
                        entry_id,
                        component_type,
                    )
                    .execute(&mut **db)
                    .await?;
                    if result.rows_affected() == 0 {
                        return Err(ModelError::Conflict("EntryComponent".to_string()));
                    }
                    history_changes.push(EntryComponentHistoryChange::remove(component_type));
                }
            }
        }
        Ok(EntryComponentMutationResult { history_changes })
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
pub struct EntryComponentHistoryChange {
    pub component_type: CompactString,
    pub action: EntryComponentHistoryAction,
    pub payload: Option<Value>,
}

impl EntryComponentHistoryChange {
    fn set(component_type: &str, payload: Value) -> Self {
        Self {
            component_type: CompactString::new(component_type),
            action: EntryComponentHistoryAction::Set,
            payload: Some(payload),
        }
    }

    fn remove(component_type: &str) -> Self {
        Self {
            component_type: CompactString::new(component_type),
            action: EntryComponentHistoryAction::Remove,
            payload: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct EntryComponentMutationResult {
    pub history_changes: Vec<EntryComponentHistoryChange>,
}

pub fn components_as_set_history_changes(
    components: &BTreeMap<String, EntryComponent>,
) -> Vec<EntryComponentHistoryChange> {
    components
        .iter()
        .map(|(component_type, component)| {
            EntryComponentHistoryChange::set(component_type, component.history_payload())
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
    pub payload: Option<Value>,
    pub created: DateTime<Utc>,
}

impl EntryComponentHistory {
    #[allow(clippy::too_many_arguments)]
    pub async fn record(
        db: &mut sqlx::Transaction<'_, sqlx::Postgres>,
        entry_effect_id: Uuid,
        entry_id: Uuid,
        key: &str,
        changes: &[EntryComponentHistoryChange],
    ) -> Result<(), ModelError> {
        let key = normalize_ident(key)?.to_lowercase();
        for change in changes {
            let result = sqlx::query_file!(
                "sql/entries/insert_component_history.sql",
                entry_effect_id,
                entry_id,
                key,
                &change.component_type,
                change.action.as_str(),
                change.payload,
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

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MessageEntryEffects {
    pub message_id: Uuid,
    pub effects: Vec<EntryEffectHistory>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::assets::{Asset, AssetPolicy};
    use crate::characters::Character;
    use crate::media::models::Media;
    use crate::notes::Note;
    use crate::scopes::models::{Scope, ScopeKind};
    use crate::spaces::{AccessPolicy, Space};
    use crate::users::User;
    use serde_json::json;
    use shared_types::messages::Entities;

    fn components<const N: usize>(
        values: [(&str, serde_json::Value); N],
    ) -> BTreeMap<String, EntryComponentPayloadInput> {
        values
            .into_iter()
            .map(|(component_type, data)| {
                (
                    component_type.to_string(),
                    EntryComponentPayloadInput::json(data),
                )
            })
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
        assert!(
            validate_component_payload(
                CORE_PORTRAIT_COMPONENT_TYPE,
                &EntryComponentPayloadInput::json(json!({})),
            )
            .is_err()
        );
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_portrait_component_validation_and_enumeration(pool: sqlx::PgPool) {
        let user = user(&pool).await;
        let space = Space::create(
            &pool,
            format!("portrait_{}", &Uuid::new_v4().simple().to_string()[..8]),
            &user.id,
            "Portrait component test".to_string(),
            None,
            Some("d20"),
        )
        .await
        .expect("create space failed");
        let image_media = Media::create(
            &pool,
            &Uuid::now_v7(),
            "image/webp",
            user.id,
            "portrait.webp",
            "portrait.webp",
            "portrait".to_string(),
            1024,
            "test",
        )
        .await
        .expect("create image media failed");
        let audio_media = Media::create(
            &pool,
            &Uuid::now_v7(),
            "audio/ogg",
            user.id,
            "portrait.ogg",
            "portrait.ogg",
            "audio".to_string(),
            1024,
            "test",
        )
        .await
        .expect("create audio media failed");

        let mut transaction = pool.begin().await.expect("begin failed");
        let image_asset = Asset::create(
            &mut transaction,
            space.id,
            image_media.id,
            user.id,
            "Portrait",
            AssetPolicy::Unlisted,
        )
        .await
        .expect("create image Asset failed");
        let audio_asset = Asset::create(
            &mut transaction,
            space.id,
            audio_media.id,
            user.id,
            "Not a portrait",
            AssetPolicy::Unlisted,
        )
        .await
        .expect("create audio Asset failed");
        let character = Character::create(
            &mut transaction,
            space.id,
            user.id,
            "Portrait Character",
            "portrait_character",
            Vec::new(),
            "",
            "",
            AccessPolicy::Personal,
            None,
            Vec::new(),
        )
        .await
        .expect("create Character failed");
        let portrait_components = |asset_id| {
            BTreeMap::from([(
                CORE_PORTRAIT_COMPONENT_TYPE.to_string(),
                EntryComponentPayloadInput::Asset { asset_id },
            )])
        };
        assert!(
            Entry::create(
                &mut transaction,
                character.scope_id,
                "invalid_portrait".to_string(),
                Vec::new(),
                "Invalid portrait".to_string(),
                None,
                portrait_components(audio_asset.id),
                Vec::new(),
                None,
            )
            .await
            .is_err()
        );
        let portrait = Entry::create(
            &mut transaction,
            character.scope_id,
            "portrait".to_string(),
            Vec::new(),
            "Portrait".to_string(),
            None,
            portrait_components(image_asset.id),
            Vec::new(),
            None,
        )
        .await
        .expect("create portrait Entry failed");
        let invalid_before_entry = Entry::create(
            &mut transaction,
            character.scope_id,
            "invalid_before_portrait".to_string(),
            Vec::new(),
            "Invalid before Portrait".to_string(),
            None,
            portrait_components(image_asset.id),
            Vec::new(),
            Some(Uuid::now_v7()),
        )
        .await;
        assert!(matches!(
            invalid_before_entry,
            Err(ModelError::NotFound("Entry"))
        ));
        let initially_main = Entry::create(
            &mut transaction,
            character.scope_id,
            "initially_main_portrait".to_string(),
            Vec::new(),
            "Initially main Portrait".to_string(),
            None,
            portrait_components(image_asset.id),
            Vec::new(),
            Some(portrait.id),
        )
        .await
        .expect("create Portrait before existing Entry failed");
        let invalid_move = Entry::move_before(
            &mut transaction,
            character.scope_id,
            portrait.id,
            portrait.metadata_version,
            Some(Uuid::now_v7()),
        )
        .await;
        assert!(matches!(invalid_move, Err(ModelError::NotFound("Entry"))));
        let portrait = Entry::move_before(
            &mut transaction,
            character.scope_id,
            portrait.id,
            portrait.metadata_version,
            Some(initially_main.id),
        )
        .await
        .expect("move Portrait failed")
        .expect("Portrait metadata version should match");

        for index in 3..=MAX_PORTRAIT_COMPONENTS_PER_SCOPE {
            Entry::create(
                &mut transaction,
                character.scope_id,
                format!("portrait_{index}"),
                Vec::new(),
                format!("Portrait {index}"),
                None,
                portrait_components(image_asset.id),
                Vec::new(),
                None,
            )
            .await
            .expect("create portrait within limit failed");
        }
        let empty_entry = Entry::create(
            &mut transaction,
            character.scope_id,
            "portrait_limit_candidate".to_string(),
            Vec::new(),
            "Portrait limit candidate".to_string(),
            None,
            BTreeMap::new(),
            Vec::new(),
            None,
        )
        .await
        .expect("create empty Entry failed");
        let create_over_limit = Entry::create(
            &mut transaction,
            character.scope_id,
            "portrait_7".to_string(),
            Vec::new(),
            "Portrait 7".to_string(),
            None,
            portrait_components(image_asset.id),
            Vec::new(),
            None,
        )
        .await;
        assert!(matches!(
            create_over_limit,
            Err(ModelError::Validation(ValidationFailed(
                PORTRAIT_COMPONENT_LIMIT_ERROR
            )))
        ));
        let set_over_limit = Entry::apply_component_mutations(
            &mut transaction,
            empty_entry.id,
            &[EntryComponentMutation::Set {
                component_type: CORE_PORTRAIT_COMPONENT_TYPE.to_string(),
                expected_version: None,
                payload: EntryComponentPayloadInput::Asset {
                    asset_id: image_asset.id,
                },
            }],
        )
        .await;
        assert!(matches!(
            set_over_limit,
            Err(ModelError::Validation(ValidationFailed(
                PORTRAIT_COMPONENT_LIMIT_ERROR
            )))
        ));
        let initially_main_version =
            initially_main.components[CORE_PORTRAIT_COMPONENT_TYPE].version();
        Entry::apply_component_mutations(
            &mut transaction,
            initially_main.id,
            &[EntryComponentMutation::Set {
                component_type: CORE_PORTRAIT_COMPONENT_TYPE.to_string(),
                expected_version: Some(initially_main_version),
                payload: EntryComponentPayloadInput::Asset {
                    asset_id: image_asset.id,
                },
            }],
        )
        .await
        .expect("replacing a portrait at the limit should succeed");
        transaction.commit().await.expect("commit failed");

        let matches =
            Entry::list_by_component(&pool, character.scope_id, CORE_PORTRAIT_COMPONENT_TYPE)
                .await
                .expect("list portrait Components failed");
        assert_eq!(matches.len(), MAX_PORTRAIT_COMPONENTS_PER_SCOPE as usize);
        assert_eq!(matches[0].metadata.id, portrait.id);
        assert!(matches!(
            matches[0].component,
            EntryComponent::Asset { asset_id, .. } if asset_id == image_asset.id
        ));
        assert_eq!(
            Entry::first_asset_by_component(
                &pool,
                character.scope_id,
                CORE_PORTRAIT_COMPONENT_TYPE,
            )
            .await
            .expect("resolve main Portrait failed"),
            Some(image_asset.id),
        );

        let mut transaction = pool.begin().await.expect("begin delete failed");
        assert!(
            Entry::delete(
                &mut transaction,
                portrait.scope_id,
                portrait.id,
                portrait.metadata_version,
            )
            .await
            .expect("delete portrait Entry failed")
        );
        transaction.commit().await.expect("commit delete failed");
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_entry_positions_leave_gaps_when_appending(pool: sqlx::PgPool) {
        let user = user(&pool).await;
        let space = Space::create(
            &pool,
            format!("positions_{}", &Uuid::new_v4().simple().to_string()[..8]),
            &user.id,
            "Entry position test".to_string(),
            None,
            Some("d20"),
        )
        .await
        .expect("create space failed");

        let mut transaction = pool.begin().await.expect("begin failed");
        let first = Entry::create(
            &mut transaction,
            space.scope_id,
            "first".to_string(),
            Vec::new(),
            "First".to_string(),
            None,
            BTreeMap::new(),
            Vec::new(),
            None,
        )
        .await
        .expect("create first Entry failed");
        let second = Entry::create(
            &mut transaction,
            space.scope_id,
            "second".to_string(),
            Vec::new(),
            "Second".to_string(),
            None,
            BTreeMap::new(),
            Vec::new(),
            None,
        )
        .await
        .expect("create second Entry failed");

        assert_eq!((first.pos_p, first.pos_q), (1024, 1));
        assert_eq!((second.pos_p, second.pos_q), (2048, 1));

        let between = Entry::create(
            &mut transaction,
            space.scope_id,
            "between".to_string(),
            Vec::new(),
            "Between".to_string(),
            None,
            BTreeMap::new(),
            Vec::new(),
            Some(second.id),
        )
        .await
        .expect("insert Entry into gap failed");
        assert!(first.pos < between.pos && between.pos < second.pos);

        let moved = Entry::move_before(
            &mut transaction,
            space.scope_id,
            first.id,
            first.metadata_version,
            None,
        )
        .await
        .expect("move Entry failed")
        .expect("Entry metadata version should match");
        assert_eq!((moved.pos_p, moved.pos_q), (3072, 1));

        transaction.commit().await.expect("commit failed");
    }

    #[sqlx::test(migrator = "crate::db::MIGRATOR")]
    async fn db_test_entry_component_payload_variants_and_orphan_repair(pool: sqlx::PgPool) {
        let user = user(&pool).await;
        let space = Space::create(
            &pool,
            format!("component_{}", &Uuid::new_v4().simple().to_string()[..8]),
            &user.id,
            "Component test".to_string(),
            None,
            Some("d20"),
        )
        .await
        .expect("create space failed");
        let media_id = Uuid::now_v7();
        Media::create(
            &pool,
            &media_id,
            "image/webp",
            user.id,
            "component.webp",
            "component.webp",
            Uuid::new_v4().simple().to_string(),
            1024,
            "test",
        )
        .await
        .expect("create media failed");

        let mut transaction = pool.begin().await.expect("begin failed");
        let asset = Asset::create(
            &mut transaction,
            space.id,
            media_id,
            user.id,
            "Component asset",
            AssetPolicy::Unlisted,
        )
        .await
        .expect("create asset failed");
        let entry = Entry::create(
            &mut transaction,
            space.scope_id,
            "illustration".to_string(),
            Vec::new(),
            "Illustration".to_string(),
            None,
            BTreeMap::from([(
                "example/thumbnail".to_string(),
                EntryComponentPayloadInput::Asset { asset_id: asset.id },
            )]),
            Vec::new(),
            None,
        )
        .await
        .expect("create entry failed");
        let history = Entry::apply_component_mutations(
            &mut transaction,
            entry.id,
            &[EntryComponentMutation::Set {
                component_type: "example/illustration".to_string(),
                expected_version: None,
                payload: EntryComponentPayloadInput::Asset { asset_id: asset.id },
            }],
        )
        .await
        .expect("set Asset Component failed");
        assert_eq!(history.history_changes.len(), 1);
        assert_eq!(
            history.history_changes[0].payload,
            Some(json!({"payloadType": "ASSET", "assetId": asset.id}))
        );
        let effect = EntryEffect::create(&mut transaction, space.id, space.scope_id, user.id)
            .await
            .expect("create Asset Component effect failed");
        EntryComponentHistory::record(
            &mut transaction,
            effect.id,
            entry.id,
            &entry.key,
            &history.history_changes,
        )
        .await
        .expect("record Asset Component history failed");
        transaction.commit().await.expect("commit failed");

        let recorded_history =
            EntryComponentHistory::list_by_entry(&pool, space.scope_id, entry.id)
                .await
                .expect("load Asset Component history failed");
        assert_eq!(recorded_history.len(), 1);
        assert_eq!(
            recorded_history[0].payload,
            Some(json!({"payloadType": "ASSET", "assetId": asset.id}))
        );

        let entry = Entry::get_by_id(&pool, space.scope_id, entry.id)
            .await
            .expect("load entry failed")
            .expect("entry missing");
        let EntryComponent::Asset {
            asset_id, version, ..
        } = entry.components["example/illustration"]
        else {
            panic!("expected Asset Component");
        };
        assert_eq!(asset_id, asset.id);
        assert!(matches!(
            entry.components.get("example/thumbnail"),
            Some(EntryComponent::Asset { asset_id, .. }) if *asset_id == asset.id
        ));
        let cached = CachedEntryComponents::load(&pool, entry.id)
            .await
            .expect("load cached Components failed")
            .to_response();
        assert!(matches!(
            cached.get("example/illustration"),
            Some(EntryComponent::Asset { asset_id, .. }) if *asset_id == asset.id
        ));
        let mut delete_transaction = pool.begin().await.expect("begin failed");
        let delete_error = Asset::delete(&mut delete_transaction, asset.id)
            .await
            .expect_err("referenced Asset must not be deleted");
        assert!(matches!(delete_error, ModelError::Conflict(_)));
        delete_transaction
            .rollback()
            .await
            .expect("rollback failed");

        let mut transaction = pool.begin().await.expect("begin failed");
        let history = Entry::apply_component_mutations(
            &mut transaction,
            entry.id,
            &[EntryComponentMutation::Set {
                component_type: "example/illustration".to_string(),
                expected_version: Some(version),
                payload: EntryComponentPayloadInput::json_with_schema(
                    json!({"replaced": true}),
                    Some(2),
                ),
            }],
        )
        .await
        .expect("replace Asset Component failed");
        assert_eq!(history.history_changes.len(), 1);
        assert_eq!(
            history.history_changes[0].action,
            EntryComponentHistoryAction::Set
        );
        transaction.commit().await.expect("commit failed");

        let other_space = Space::create(
            &pool,
            format!("component_{}", &Uuid::new_v4().simple().to_string()[..8]),
            &user.id,
            "Other component test".to_string(),
            None,
            Some("d20"),
        )
        .await
        .expect("create other space failed");
        let mut transaction = pool.begin().await.expect("begin failed");
        let foreign_asset = Asset::create(
            &mut transaction,
            other_space.id,
            media_id,
            user.id,
            "Foreign component asset",
            AssetPolicy::Unlisted,
        )
        .await
        .expect("create foreign asset failed");
        transaction.commit().await.expect("commit failed");
        let current = Entry::get_by_id(&pool, space.scope_id, entry.id)
            .await
            .expect("load current entry failed")
            .expect("entry missing");
        let current_version = current.components["example/illustration"].version();
        let mut transaction = pool.begin().await.expect("begin failed");
        let foreign_asset_result = Entry::apply_component_mutations(
            &mut transaction,
            entry.id,
            &[EntryComponentMutation::Set {
                component_type: "example/illustration".to_string(),
                expected_version: Some(current_version),
                payload: EntryComponentPayloadInput::Asset {
                    asset_id: foreign_asset.id,
                },
            }],
        )
        .await;
        assert!(matches!(
            foreign_asset_result,
            Err(ModelError::NotFound("Asset"))
        ));
        transaction.rollback().await.expect("rollback failed");

        sqlx::query(
            "INSERT INTO entry_components (entry_id, component_type, payload_type) VALUES ($1, $2, 'Json')",
        )
        .bind(entry.id)
        .bind("core/orphan")
        .execute(&pool)
        .await
        .expect("create orphan parent failed");
        let entry_with_orphan = Entry::get_by_id(&pool, space.scope_id, entry.id)
            .await
            .expect("load entry with orphan failed")
            .expect("entry missing");
        assert!(!entry_with_orphan.components.contains_key("core/orphan"));
        let cached_with_orphan = CachedEntryComponents::load(&pool, entry.id)
            .await
            .expect("load cached Components with orphan failed")
            .to_response();
        assert!(!cached_with_orphan.contains_key("core/orphan"));

        let mut transaction = pool.begin().await.expect("begin failed");
        let history = Entry::apply_component_mutations(
            &mut transaction,
            entry.id,
            &[EntryComponentMutation::Set {
                component_type: "core/orphan".to_string(),
                expected_version: None,
                payload: EntryComponentPayloadInput::json(json!({"repaired": true})),
            }],
        )
        .await
        .expect("repair orphan failed");
        assert_eq!(history.history_changes.len(), 1);
        transaction.commit().await.expect("commit failed");
        let repaired = Entry::get_by_id(&pool, space.scope_id, entry.id)
            .await
            .expect("load repaired entry failed")
            .expect("entry missing");
        assert_eq!(
            repaired.components["core/orphan"].json_data(),
            json!({"repaired": true})
        );
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
            None,
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
            &components_as_set_history_changes(&entry.components),
        )
        .await
        .expect("create history failed");
        transaction.commit().await.expect("commit failed");

        let invalid_component = sqlx::query(
            "INSERT INTO entry_components (entry_id, component_type, payload_type) VALUES ($1, $2, 'Json')",
        )
        .bind(entry.id)
        .bind("Invalid/type")
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
            None,
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
        )
        .await
        .expect("update failed")
        .expect("entry missing");
        transaction.commit().await.expect("commit failed");
        assert_ne!(updated.metadata_version, entry.metadata_version);
        assert_eq!(
            updated.components["core/counter"].json_data(),
            json!({"value": 10})
        );
        assert_eq!(updated.components["core/counter"].schema_version(), 1);
        assert_eq!(updated.tags.as_ref(), [CompactString::new("State")]);

        let metadata_version = updated.metadata_version;
        let core_version = updated.components["core/counter"].version();
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
                    payload: EntryComponentPayloadInput::json_with_schema(
                        json!({"anything": true}),
                        Some(2),
                    ),
                },
                EntryComponentMutation::Remove {
                    component_type: "core/counter".to_string(),
                    expected_version: Some(core_version),
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
            &changes.history_changes,
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
            updated.components["example/custom"].json_data(),
            json!({"anything": true})
        );
        assert_eq!(updated.components["example/custom"].schema_version(), 2);
        let custom_version = updated.components["example/custom"].version();

        let mut transaction = pool.begin().await.expect("begin failed");
        let changes = Entry::apply_component_mutations(
            &mut transaction,
            updated.id,
            &[EntryComponentMutation::Set {
                component_type: "example/custom".to_string(),
                expected_version: Some(custom_version),
                payload: EntryComponentPayloadInput::json(json!({"anything": "updated"})),
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
            &changes.history_changes,
        )
        .await
        .expect("record component update failed");
        transaction.commit().await.expect("commit failed");

        let after_component_update = Entry::get_by_id(&pool, space_scope.id, entry.id)
            .await
            .expect("entry lookup failed")
            .expect("entry missing");
        assert_eq!(
            after_component_update.components["example/custom"].schema_version(),
            2,
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
                        after_component_update.components["example/custom"].version(),
                    ),
                    payload: EntryComponentPayloadInput::json_with_schema(
                        json!({"anything": false}),
                        Some(3),
                    ),
                },
                EntryComponentMutation::Remove {
                    component_type: "example/missing".to_string(),
                    expected_version: Some(Uuid::new_v4()),
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
            after_rollback.components["example/custom"].json_data(),
            json!({"anything": "updated"})
        );
        assert_eq!(
            after_rollback.components["example/custom"].version(),
            after_component_update.components["example/custom"].version(),
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
            None,
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
            &components_as_set_history_changes(&replacement.components),
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
                && row.payload
                    == Some(json!({
                        "payloadType": "JSON",
                        "schemaVersion": 1,
                        "data": {"value": 10}
                    }))
        }));
        assert!(history.iter().any(|row| {
            row.component_type == "core/counter"
                && row.action == EntryComponentHistoryAction::Remove
                && row.payload.is_none()
        }));
        assert!(history.iter().any(|row| {
            row.component_type == "example/custom"
                && row.action == EntryComponentHistoryAction::Set
                && row.payload
                    == Some(json!({
                        "payloadType": "JSON",
                        "schemaVersion": 2,
                        "data": {"anything": "updated"}
                    }))
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
