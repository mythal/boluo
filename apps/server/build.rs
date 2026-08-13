use std::path::Path;
use std::time::Duration;

use sqlx::migrate::Migrator;
use sqlx::postgres::PgConnection;
use sqlx::{Connection, Row};

const DATABASE_CHECK_TIMEOUT: Duration = Duration::from_secs(1);

fn main() {
    let workspace_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(Path::parent)
        .expect("server package must be nested in the workspace");
    let env_local = workspace_dir.join(".env.local");
    let env_file = workspace_dir.join(".env");
    let migrations_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("migrations");

    dotenvy::from_path(&env_local).ok();
    dotenvy::from_path(&env_file).ok();

    if env_local.exists() {
        println!("cargo:rerun-if-changed={}", env_local.display());
    }
    println!("cargo:rerun-if-changed={}", env_file.display());
    println!("cargo:rerun-if-env-changed=DATABASE_URL");
    println!("cargo:rerun-if-env-changed=SQLX_OFFLINE");
    println!("cargo:rerun-if-changed={}", migrations_dir.display());

    if let Ok(url) = std::env::var("DATABASE_URL") {
        println!("cargo::rustc-env=DATABASE_URL={url}");
    }

    if std::env::var("PROFILE").as_deref() == Ok("release") {
        return;
    }

    if std::env::var("SQLX_OFFLINE").is_ok() {
        return;
    }

    let offline_reason = match std::env::var("DATABASE_URL") {
        Ok(url) => database_latest_migration_status(&url, &migrations_dir).err(),
        Err(_) => Some("DATABASE_URL is not set".to_owned()),
    };

    if let Some(reason) = offline_reason {
        println!("cargo::warning=using SQLx offline mode: {reason}");
        println!("cargo::rustc-env=SQLX_OFFLINE=true");
    }
}

fn database_latest_migration_status(
    database_url: &str,
    migrations_dir: &Path,
) -> Result<(), String> {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|error| format!("failed to initialize async runtime: {error}"))?;

    runtime.block_on(async {
        let migrator = Migrator::new(migrations_dir)
            .await
            .map_err(|error| format!("failed to load local migrations: {error}"))?;
        let latest = migrator
            .iter()
            .filter(|migration| migration.migration_type.is_up_migration())
            .max_by_key(|migration| migration.version)
            .ok_or_else(|| "no local migrations found".to_owned())?;

        let mut connection =
            tokio::time::timeout(DATABASE_CHECK_TIMEOUT, PgConnection::connect(database_url))
                .await
                .map_err(|_| "database connection timed out".to_owned())?
                .map_err(|error| format!("failed to connect to database: {error}"))?;

        let row = tokio::time::timeout(
            DATABASE_CHECK_TIMEOUT,
            sqlx::query(
                "SELECT version, success, checksum \
                     FROM _sqlx_migrations \
                     ORDER BY version DESC \
                     LIMIT 1",
            )
            .fetch_optional(&mut connection),
        )
        .await
        .map_err(|_| "migration status query timed out".to_owned())?
        .map_err(|error| format!("failed to query _sqlx_migrations: {error}"))?
        .ok_or_else(|| "_sqlx_migrations has no applied migrations".to_owned())?;

        let version: i64 = row
            .try_get("version")
            .map_err(|error| format!("failed to decode migration version: {error}"))?;
        let success: bool = row
            .try_get("success")
            .map_err(|error| format!("failed to decode migration status: {error}"))?;
        let checksum: Vec<u8> = row
            .try_get("checksum")
            .map_err(|error| format!("failed to decode migration checksum: {error}"))?;

        if !success {
            return Err(format!(
                "database migration {version} is marked unsuccessful"
            ));
        }
        if version != latest.version {
            return Err(format!(
                "database migration version {version} does not match local version {}",
                latest.version
            ));
        }
        if checksum.as_slice() != latest.checksum.as_ref() {
            return Err(format!("migration {version} checksum does not match"));
        }

        Ok(())
    })
}
