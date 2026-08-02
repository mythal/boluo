use serde::Deserialize;
use uuid::Uuid;

use crate::spaces::AccessPolicy;

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListCharacters {
    pub space_id: Uuid,
    #[serde(default)]
    pub include_archived: bool,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct QueryCharacter {
    pub space_id: Uuid,
    pub character_id: Uuid,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveCharacter {
    pub space_id: Uuid,
    pub character_id: Uuid,
    pub expected_version: Uuid,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct RestoreCharacter {
    pub space_id: Uuid,
    pub character_id: Uuid,
    pub expected_version: Uuid,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CheckCharacterIdentifier {
    pub space_id: Uuid,
    pub identifier: String,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateCharacter {
    pub space_id: Uuid,
    pub name: String,
    pub key: String,
    #[serde(default)]
    pub aliases: Vec<String>,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub color: String,
    pub access_policy: AccessPolicy,
    pub access_channel_id: Option<Uuid>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub asset_ids: Vec<Uuid>,
}

#[derive(Deserialize, Debug, specta::Type)]
#[serde(rename_all = "camelCase")]
/// Complete replacement of editable character fields. Archive state is managed separately.
pub struct EditCharacter {
    pub space_id: Uuid,
    pub character_id: Uuid,
    pub expected_version: Uuid,
    pub expected_scope_version: Uuid,
    pub name: String,
    pub key: String,
    pub aliases: Vec<String>,
    pub description: String,
    pub color: String,
    pub access_policy: AccessPolicy,
    pub access_channel_id: Option<Uuid>,
    pub tags: Vec<String>,
    pub asset_ids: Vec<Uuid>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn check_character_identifier_decodes_scalar_query() {
        let space_id = Uuid::now_v7();
        let query = format!("spaceId={space_id}&identifier=investigator%20one");
        let payload: CheckCharacterIdentifier =
            serde_urlencoded::from_str(&query).expect("query should decode");

        assert_eq!(payload.space_id, space_id);
        assert_eq!(payload.identifier, "investigator one");
    }
}
