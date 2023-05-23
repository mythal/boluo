use postgres_types::FromSql;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Serialize, Deserialize, FromSql, Clone, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
#[postgres(name = "proxies")]
pub struct Proxy {
    pub name: String,
    pub url: String,
    pub region: String,
}
