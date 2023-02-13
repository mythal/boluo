use clap::Parser;
use postgres::{Client, NoTls};

#[derive(Parser)]
#[clap(version = "0.0", author = "Tachibana Kiyomi <me@yuru.me>")]
struct Opts {
    #[clap(subcommand)]
    subcmd: SubCommand,
}

#[derive(Parser)]
enum SubCommand {
    Init(Init),
}

#[derive(Parser)]
struct Init {
    database_url: Option<String>,
}

fn main() -> Result<(), anyhow::Error> {
    dotenv::dotenv().ok();
    let opts: Opts = Opts::parse();

    match opts.subcmd {
        SubCommand::Init(Init { database_url }) => {
            println!("initializing database");

            let database_url = database_url.or(std::env::var("DATABASE_URL").ok()).unwrap();

            let mut client = Client::connect(&database_url, NoTls)?;
            client.batch_execute(include_str!("../../server/schema.sql"))?;
        }
    }
    Ok(())
}
