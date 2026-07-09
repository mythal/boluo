use std::path::{Path, PathBuf};
use std::process::Command;

pub(crate) fn prepare() {
    std::env::set_current_dir(workspace_root()).expect("Failed to switch to workspace root");
}

pub(crate) fn run() {
    crate::ts::export();
    run_optional_command("npm", &["install"]);
    run_optional_command(
        "npm",
        &[
            "exec",
            "prettier",
            "--",
            "--write",
            "./packages/types/bindings.ts",
        ],
    );
    run_command(
        "cargo",
        &["sqlx", "prepare", "--workspace", "--", "--tests"],
    );
}

fn workspace_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(Path::parent)
        .expect("server crate should be under apps/server")
        .to_path_buf()
}

fn run_command(program: &str, args: &[&str]) {
    match run_command_status(program, args) {
        | Ok(true) => {}
        | Ok(false) => std::process::exit(1),
        | Err(error) => panic!("Failed to run {program}: {error}"),
    }
}

fn run_optional_command(program: &str, args: &[&str]) {
    match run_command_status(program, args) {
        | Ok(true) => {}
        | Ok(false) => warn_optional_command_failed(program, args, None),
        | Err(error) => warn_optional_command_failed(program, args, Some(&error)),
    }
}

fn run_command_status(program: &str, args: &[&str]) -> Result<bool, std::io::Error> {
    println!("$ {program} {}", args.join(" "));
    let status = Command::new(program).args(args).status()?;

    Ok(status.success())
}

fn warn_optional_command_failed(program: &str, args: &[&str], error: Option<&std::io::Error>) {
    let reason = error.map(|error| format!(": {error}")).unwrap_or_default();
    eprintln!(
        "warning: `{program} {}` failed{reason}; continuing without it",
        args.join(" ")
    );
}
