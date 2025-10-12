use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::process::Command;

use anyhow::{Context, Result, anyhow};
use once_cell::sync::Lazy;

static REPO_ROOT: Lazy<PathBuf> = Lazy::new(|| Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."));
const THEME_FILE_RELATIVE: &str = "packages/tailwind-config/theme.tailwind.css";
const SEARCH_GLOBS: &[&str] = &["*.ts", "*.tsx", "*.html", "*.htm"];

pub fn compute_usage_counts(names: &[String]) -> Result<BTreeMap<String, usize>> {
    let mut result = BTreeMap::new();
    for name in names {
        let term = extract_search_term(name);
        if let Some(pattern) = term {
            let count = ripgrep_count(&pattern)
                .with_context(|| format!("Failed to search usage for {name}"))?;
            result.insert(name.clone(), count);
        } else {
            result.insert(name.clone(), 0);
        }
    }
    Ok(result)
}

fn extract_search_term(name: &str) -> Option<String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return None;
    }

    let without_color_prefix = if let Some(rest) = trimmed.strip_prefix("--color-") {
        rest.trim().to_owned()
    } else {
        trimmed.trim_start_matches('-').trim().to_owned()
    };

    if without_color_prefix.is_empty() {
        None
    } else {
        Some(without_color_prefix)
    }
}

fn ripgrep_count(pattern: &str) -> Result<usize> {
    if pattern.is_empty() {
        return Ok(0);
    }

    let mut command = Command::new("rg");
    command.current_dir(repo_root());

    for glob in SEARCH_GLOBS {
        command.arg("--glob").arg(glob);
    }

    command
        .arg("--glob")
        .arg(format!("!{THEME_FILE_RELATIVE}"))
        .arg("--glob")
        .arg("!apps/storybook/src/SemanticColors.stories.tsx")
        .arg("--fixed-strings")
        .arg("--no-heading")
        .arg("--count")
        .arg(pattern);

    let output = command
        .output()
        .with_context(|| format!("Failed to spawn ripgrep for pattern '{pattern}'"))?;

    if output.status.success() || output.status.code() == Some(1) {
        let stdout = String::from_utf8(output.stdout)?;
        let mut total = 0usize;
        for line in stdout.lines() {
            if let Some((_, count_str)) = line.rsplit_once(':')
                && let Ok(count) = count_str.trim().parse::<usize>()
            {
                total += count;
            }
        }
        Ok(total)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(anyhow!("ripgrep failed for pattern '{pattern}': {stderr}"))
    }
}

fn repo_root() -> &'static Path {
    &REPO_ROOT
}
