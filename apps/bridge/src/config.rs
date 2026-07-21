//! Configuration parsed from a KDL or JSON file with separate `boluo` and
//! `telegram` sections.

use std::path::{Path, PathBuf};

use anyhow::{Context, Result, anyhow};
use kdl::KdlDocument;
use serde::Deserialize;

const DEFAULT_BOLUO_BASE_URL: &str = "https://production.boluo.chat";

#[derive(Debug, Clone)]
pub struct Config {
    pub boluo_base_url: String,
    /// When absent, `boluo_username`/`boluo_password` are used to log in.
    pub bridge_session: Option<String>,
    pub boluo_username: Option<String>,
    pub boluo_password: Option<String>,

    pub tg_bot_token: String,

    pub sqlite_path: Option<PathBuf>,
}

impl Config {
    pub fn load(path: impl AsRef<Path>) -> Result<Self> {
        let path = path.as_ref();
        let text = std::fs::read_to_string(path)
            .with_context(|| format!("failed to read config {}", path.display()))?;
        match path.extension().and_then(|extension| extension.to_str()) {
            Some(extension) if extension.eq_ignore_ascii_case("json") => Self::parse_json(&text),
            Some(extension) if extension.eq_ignore_ascii_case("kdl") => Self::parse_kdl(&text),
            _ => Err(anyhow!(
                "unsupported config file extension for {}; expected .kdl or .json",
                path.display()
            )),
        }
    }

    fn parse_kdl(text: &str) -> Result<Self> {
        let doc: KdlDocument = text.parse().context("failed to parse KDL config")?;
        let boluo = get_section(&doc, "boluo")?;
        let telegram = get_section(&doc, "telegram")?;

        let boluo_base_url = get_string_opt(boluo, "base-url", "boluo.base-url")?
            .unwrap_or_else(|| DEFAULT_BOLUO_BASE_URL.to_string())
            .trim_end_matches('/')
            .to_string();
        let bridge_session = get_string_opt(boluo, "session", "boluo.session")?;
        let boluo_username = get_string_opt(boluo, "username", "boluo.username")?;
        let boluo_password = get_string_opt(boluo, "password", "boluo.password")?;
        let tg_bot_token = get_string(telegram, "bot-token", "telegram.bot-token")?;

        let sqlite_path = get_string_opt(&doc, "sqlite-path", "sqlite-path")?.map(PathBuf::from);

        Self::validate(
            boluo_base_url,
            bridge_session,
            boluo_username,
            boluo_password,
            tg_bot_token,
            sqlite_path,
        )
    }

    fn parse_json(text: &str) -> Result<Self> {
        let raw: JsonConfig = serde_json::from_str(text).context("failed to parse JSON config")?;
        let boluo_base_url = raw
            .boluo
            .base_url
            .unwrap_or_else(|| DEFAULT_BOLUO_BASE_URL.to_string())
            .trim_end_matches('/')
            .to_string();

        Self::validate(
            boluo_base_url,
            raw.boluo.session,
            raw.boluo.username,
            raw.boluo.password,
            raw.telegram.bot_token,
            raw.sqlite_path,
        )
    }

    fn validate(
        boluo_base_url: String,
        bridge_session: Option<String>,
        boluo_username: Option<String>,
        boluo_password: Option<String>,
        tg_bot_token: String,
        sqlite_path: Option<PathBuf>,
    ) -> Result<Self> {
        if bridge_session.is_none() && (boluo_username.is_none() || boluo_password.is_none()) {
            return Err(anyhow!(
                "config must provide either `boluo.session` or both `boluo.username` and `boluo.password`"
            ));
        }

        Ok(Config {
            boluo_base_url,
            bridge_session,
            boluo_username,
            boluo_password,
            tg_bot_token,
            sqlite_path,
        })
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct JsonConfig {
    boluo: JsonBoluoConfig,
    telegram: JsonTelegramConfig,
    sqlite_path: Option<PathBuf>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct JsonBoluoConfig {
    base_url: Option<String>,
    session: Option<String>,
    username: Option<String>,
    password: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct JsonTelegramConfig {
    bot_token: String,
}

fn get_section<'a>(doc: &'a KdlDocument, name: &str) -> Result<&'a KdlDocument> {
    doc.get(name)
        .and_then(|node| node.children())
        .ok_or_else(|| anyhow!("missing required config section `{name}`"))
}

/// Read the first string argument of a node.
fn get_string(doc: &KdlDocument, name: &str, key: &str) -> Result<String> {
    get_string_opt(doc, name, key)?.ok_or_else(|| anyhow!("missing required config key `{key}`"))
}

fn get_string_opt(doc: &KdlDocument, name: &str, key: &str) -> Result<Option<String>> {
    let Some(node) = doc.get(name) else {
        return Ok(None);
    };
    let entry = node
        .entries()
        .first()
        .ok_or_else(|| anyhow!("config key `{key}` has no value"))?;
    let value = entry
        .value()
        .as_string()
        .ok_or_else(|| anyhow!("config key `{key}` must be a string"))?;
    Ok(Some(value.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    const CONFIG: &str = r#"
        boluo {
            base-url "https://boluo.example/"
            session "session-token"
        }
        telegram {
            bot-token "123:token"
        }
        sqlite-path ".tmp/custom.db"
    "#;

    #[test]
    fn parses_sectioned_config() {
        let config = Config::parse_kdl(CONFIG).unwrap();

        assert_eq!(config.boluo_base_url, "https://boluo.example");
        assert_eq!(config.bridge_session.as_deref(), Some("session-token"));
        assert_eq!(config.tg_bot_token, "123:token");
        assert_eq!(config.sqlite_path, Some(PathBuf::from(".tmp/custom.db")));
    }

    #[test]
    fn uses_production_boluo_url_by_default() {
        let text = CONFIG.replace("base-url \"https://boluo.example/\"", "");
        let config = Config::parse_kdl(&text).unwrap();

        assert_eq!(config.boluo_base_url, DEFAULT_BOLUO_BASE_URL);
    }

    #[test]
    fn accepts_username_and_password_authentication() {
        let text = CONFIG.replace(
            "session \"session-token\"",
            "username \"bridge\"\npassword \"secret\"",
        );
        let config = Config::parse_kdl(&text).unwrap();

        assert_eq!(config.bridge_session, None);
        assert_eq!(config.boluo_username.as_deref(), Some("bridge"));
        assert_eq!(config.boluo_password.as_deref(), Some("secret"));
    }

    #[test]
    fn rejects_flat_config() {
        let error = Config::parse_kdl("boluo-base-url \"https://boluo.example\"").unwrap_err();

        assert!(error.to_string().contains("section `boluo`"));
    }

    #[test]
    fn parses_json_config() {
        let config = Config::parse_json(
            r#"{
                "boluo": {
                    "base-url": "https://boluo.example/",
                    "username": "bridge",
                    "password": "secret"
                },
                "telegram": { "bot-token": "123:token" },
                "sqlite-path": ".tmp/custom.db"
            }"#,
        )
        .unwrap();

        assert_eq!(config.boluo_base_url, "https://boluo.example");
        assert_eq!(config.boluo_username.as_deref(), Some("bridge"));
        assert_eq!(config.tg_bot_token, "123:token");
        assert_eq!(config.sqlite_path, Some(PathBuf::from(".tmp/custom.db")));
    }

    #[test]
    fn database_path_is_optional() {
        let text = CONFIG.replace("sqlite-path \".tmp/custom.db\"", "");
        let config = Config::parse_kdl(&text).unwrap();

        assert_eq!(config.sqlite_path, None);
    }
}
