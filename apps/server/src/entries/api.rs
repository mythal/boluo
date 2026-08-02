use serde::Deserialize;
use std::collections::BTreeMap;
use uuid::Uuid;

use super::models::EntryComponentMutation;

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListEntries {
    pub space_id: Uuid,
    pub scope_id: Uuid,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct QueryEntry {
    pub space_id: Uuid,
    pub scope_id: Uuid,
    pub entry_id: Uuid,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct EntryHistoryQuery {
    pub space_id: Uuid,
    pub scope_id: Uuid,
    #[serde(default)]
    pub entry_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct EntryComponentHistoryQuery {
    pub space_id: Uuid,
    pub scope_id: Uuid,
    #[serde(default)]
    pub entry_id: Option<Uuid>,
    #[serde(default)]
    pub key: Option<String>,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct QueryEntryEffects {
    pub space_id: Uuid,
    pub entry_effect_ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CheckEntryIdentifier {
    pub space_id: Uuid,
    pub scope_id: Uuid,
    pub identifier: String,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateEntry {
    pub space_id: Uuid,
    pub scope_id: Uuid,
    pub key: String,
    #[serde(default)]
    pub aliases: Vec<String>,
    pub display_name: String,
    pub reference_note_id: Option<Uuid>,
    #[serde(default)]
    pub components: BTreeMap<String, serde_json::Value>,
    #[serde(default)]
    pub tags: Vec<String>,
    pub sort: i32,
    pub message_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct EditEntry {
    pub space_id: Uuid,
    pub scope_id: Uuid,
    pub entry_id: Uuid,
    pub expected_metadata_version: Uuid,
    pub message_id: Option<Uuid>,
    pub key: String,
    pub aliases: Vec<String>,
    pub display_name: String,
    pub reference_note_id: Option<Uuid>,
    pub tags: Vec<String>,
    pub sort: i32,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct EditEntryComponents {
    pub space_id: Uuid,
    pub scope_id: Uuid,
    pub entry_id: Uuid,
    pub message_id: Option<Uuid>,
    pub changes: Vec<EntryComponentMutation>,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DeleteEntry {
    pub space_id: Uuid,
    pub scope_id: Uuid,
    pub entry_id: Uuid,
    pub expected_metadata_version: Uuid,
    pub message_id: Option<Uuid>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn check_entry_identifier_decodes_scalar_query() {
        let scope_id = Uuid::now_v7();
        let space_id = Uuid::now_v7();
        let query = format!("spaceId={space_id}&scopeId={scope_id}&identifier=health%20points");
        let payload: CheckEntryIdentifier =
            serde_urlencoded::from_str(&query).expect("query should decode");

        assert_eq!(payload.space_id, space_id);
        assert_eq!(payload.scope_id, scope_id);
        assert_eq!(payload.identifier, "health points");
    }
}
