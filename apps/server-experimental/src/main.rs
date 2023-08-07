use clap::Parser;
use server::User;

mod server;

#[derive(Parser)]
#[clap(version = "0.0")]
struct Opts {
    #[clap(subcommand)]
    subcmd: SubCommand,
}

#[derive(Parser)]
enum SubCommand {
    Serve,
    Export,
}

#[tokio::main]
async fn main() {
    let opts = Opts::parse();
    match opts.subcmd {
        SubCommand::Serve => server::serve().await,
        SubCommand::Export => {
            specta::export::ts("./types.ts").unwrap();
        }
    }
}
