use std::path::PathBuf;

use aws_credential_types::{provider::SharedCredentialsProvider, Credentials};
use clap::Parser;
use native_tls::TlsConnector;

#[derive(Parser)]
#[clap(version = "0.0", author = "uonr")]
struct Opts {
    #[clap(subcommand)]
    subcmd: SubCommand,
}

#[derive(Parser)]
enum SubCommand {
    Init(Init),
    MigrateMedia(MigrateMedia),
}

#[derive(Parser, Debug)]
struct MigrateMedia {
    #[arg(env = "DATABASE_URL")]
    database_url: String,
    #[arg(env = "S3_BUCKET_NAME")]
    s3_bucket: String,
    #[arg(env = "S3_SECRET_ACCESS_KEY")]
    s3_secret_access_key: String,
    #[arg(env = "S3_ACCESS_KEY_ID")]
    s3_access_key_id: String,
    #[arg(env = "S3_ENDPOINT_URL")]
    s3_endpoint: String,
    #[arg(default_value_t = String::from("./media"))]
    media_dir: String,
}

struct Media {
    id: uuid::Uuid,
    filename: String,
}

#[derive(Parser)]
struct Init {
    #[arg(env = "DATABASE_URL")]
    database_url: String,
}

async fn get_postgres_client(database_url: String) -> tokio_postgres::Client {
    let connector = TlsConnector::builder().build().expect("Failed to build TLS connector");
    let connector = postgres_native_tls::MakeTlsConnector::new(connector);
    let (client, connection) = tokio_postgres::connect(&database_url, connector)
        .await
        .expect("Failed to connect to database");
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });
    client
}

async fn migrate_media(
    MigrateMedia {
        database_url,
        media_dir,
        s3_bucket,
        s3_endpoint,
        s3_access_key_id,
        s3_secret_access_key,
    }: MigrateMedia,
) {
    let db = get_postgres_client(database_url).await;
    let media_list = db
        .query(include_str!("list_media.sql"), &[])
        .await
        .unwrap()
        .into_iter()
        .map(|row| Media {
            id: row.get(0),
            filename: row.get(1),
        })
        .collect::<Vec<_>>();
    let credentials = Credentials::new(s3_access_key_id, s3_secret_access_key, None, None, "boluo");
    let credentials_provider = SharedCredentialsProvider::new(credentials);
    let config = aws_config::SdkConfig::builder()
        .region(aws_sdk_s3::config::Region::new("auto"))
        .endpoint_url(s3_endpoint)
        .credentials_provider(credentials_provider)
        .build();
    let s3 = aws_sdk_s3::Client::new(&config);
    let media_dir = std::path::Path::new(&media_dir);
    let total = media_list.len();
    let mut failed_list: Vec<PathBuf> = Vec::new();
    for (i, media) in media_list.into_iter().enumerate() {
        let media_path = media_dir.join(&media.filename);
        if !media_path.exists() {
            eprintln!("{} not exists, skip", media_path.display());
            continue;
        }
        let Ok(media_path) = media_path.canonicalize() else {
            eprintln!("failed to canonicalize {}", media_path.display());
            failed_list.push(media_path);
            continue;
        };
        println!("[{}/{}] uploading {}", i + 1, total, media_path.display());
        // upload file
        // https://docs.aws.amazon.com/sdk-for-rust/latest/dg/rust_s3_code_examples.html
        let Ok(body) = aws_sdk_s3::primitives::ByteStream::from_path(media_path.clone()).await else {
            eprintln!("failed to read {}", media_path.display());
            failed_list.push(media_path);
            continue;
        };
        let Ok(_) = s3
            .put_object()
            .bucket(s3_bucket.clone())
            .key(media.id.as_hyphenated().to_string())
            .body(body)
            .send()
            .await
        else {
            eprintln!("failed to read {}", media_path.display());
            continue;
        };
    }
    // Write failed list to /tmp/failed_list.txt
    let failed_list = failed_list
        .into_iter()
        .map(|path| path.display().to_string())
        .collect::<Vec<_>>()
        .join("\n");
    std::fs::write("/tmp/failed_list.txt", failed_list).expect("failed to write failed list");
}

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    dotenv::from_filename(".env.local").ok();
    dotenv::dotenv().ok();
    let opts: Opts = Opts::parse();

    match opts.subcmd {
        SubCommand::Init(Init { database_url }) => {
            println!("initializing database");
            let client = get_postgres_client(database_url).await;
            client.batch_execute(include_str!("../../server/schema.sql")).await?;
        }
        SubCommand::MigrateMedia(migrate_info) => {
            dbg!(&migrate_info);
            migrate_media(migrate_info).await;
        }
    }
    Ok(())
}
