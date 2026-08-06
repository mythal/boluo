use serde::Deserialize;
use std::collections::BTreeMap;
use uuid::Uuid;

use super::models::{EntryComponentMutation, EntryComponentPayloadInput};

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListEntries {
    pub space_id: Uuid,
    pub scope_id: Uuid,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListEntriesByComponent {
    pub space_id: Uuid,
    pub scope_id: Uuid,
    pub component_type: String,
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
    pub components: BTreeMap<String, EntryComponentPayloadInput>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub before_entry_id: Option<Uuid>,
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
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct MoveEntry {
    pub space_id: Uuid,
    pub scope_id: Uuid,
    pub entry_id: Uuid,
    pub expected_metadata_version: Uuid,
    /// Omit or set to `null` to move the Entry to the end.
    #[serde(default)]
    pub before_entry_id: Option<Uuid>,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct EditEntryComponents {
    pub space_id: Uuid,
    pub scope_id: Uuid,
    pub entry_id: Uuid,
    pub message_id: Option<Uuid>,
    #[serde(default)]
    pub skip_record_history: bool,
    /// Keep the Entry when the mutations leave it with no Components.
    #[serde(default)]
    pub keep_empty_entry: bool,
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

    #[test]
    fn edit_components_records_history_by_default() {
        let json = serde_json::json!({
            "spaceId": Uuid::now_v7(),
            "scopeId": Uuid::now_v7(),
            "entryId": Uuid::now_v7(),
            "messageId": null,
            "changes": [{
                "action": "SET",
                "componentType": "example/counter",
                "expectedVersion": null,
                "payloadType": "JSON",
                "data": {"value": 1}
            }]
        });
        let payload: EditEntryComponents = sonic_rs::from_slice(json.to_string().as_bytes())
            .expect("component mutation should decode");

        assert!(!payload.skip_record_history);
        assert!(!payload.keep_empty_entry);
    }
}
