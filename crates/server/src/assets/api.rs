use serde::Deserialize;
use uuid::Uuid;

use super::AssetPolicy;

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct QueryAsset {
    pub space_id: Uuid,
    pub asset_id: Uuid,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct ListAssets {
    pub space_id: Uuid,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateAsset {
    pub space_id: Uuid,
    pub media_id: Uuid,
    pub name: String,
    #[serde(default)]
    pub policy: AssetPolicy,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAsset {
    pub asset_id: Uuid,
    pub name: String,
    pub policy: AssetPolicy,
}

#[derive(Debug, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct DeleteAsset {
    pub asset_id: Uuid,
}
