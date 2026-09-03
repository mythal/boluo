use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, SystemTime};

use quick_cache::sync::Cache;
use serde::Serialize;
use sourcemap::SourceMap;

pub(crate) const DEFAULT_SOURCE_MAP_CACHE_BYTES: usize = 8 * 1024 * 1024;
pub(crate) const DEFAULT_SOURCE_MAP_DISK_CACHE_RATIO: usize = 16;
const FILE_CACHE_CLEANUP_INTERVAL: Duration = Duration::from_secs(60 * 60);
const FILE_CACHE_CLEANUP_TARGET_RATIO: usize = 80;

#[derive(Clone)]
pub(crate) struct Config {
    pub(crate) source_map_base_url: Option<url::Url>,
    pub(crate) source_map_cache_bytes: usize,
    pub(crate) source_map_disk_cache_ratio: usize,
    pub(crate) source_map_disk_cache_path: PathBuf,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            source_map_base_url: None,
            source_map_cache_bytes: DEFAULT_SOURCE_MAP_CACHE_BYTES,
            source_map_disk_cache_ratio: DEFAULT_SOURCE_MAP_DISK_CACHE_RATIO,
            source_map_disk_cache_path: std::env::temp_dir().join("boluo-frontend-sourcemaps"),
        }
    }
}

#[derive(Clone, Copy)]
pub(crate) struct StackFrame<'a> {
    pub(crate) filename: &'a str,
    pub(crate) function: &'a str,
    pub(crate) lineno: Option<u64>,
    pub(crate) colno: Option<u64>,
}

pub(crate) struct SymbolicatedStacktrace {
    pub(crate) stacktrace: String,
    pub(crate) raw_stacktrace: String,
    pub(crate) status: &'static str,
}

pub(crate) struct SymbolicatedComponentStack {
    pub(crate) component_stacktrace: String,
    pub(crate) raw_component_stack: String,
    pub(crate) status: &'static str,
}

struct ComponentStackFrame<'a> {
    function: &'a str,
    filename: Option<&'a str>,
    lineno: Option<u64>,
    colno: Option<u64>,
}

#[derive(Serialize)]
struct FaroStacktraceJson<'a> {
    frames: Vec<FaroStackFrameJson<'a>>,
}

#[derive(Serialize)]
struct FaroStackFrameJson<'a> {
    filename: &'a str,
    function: &'a str,
    lineno: Option<u64>,
    colno: Option<u64>,
}

#[derive(Serialize)]
struct SentryStacktraceJson {
    frames: Vec<SentryStackFrameJson>,
}

#[derive(Serialize)]
struct SentryStackFrameJson {
    filename: String,
    function: String,
    lineno: u64,
    colno: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    abs_path: Option<String>,
    in_app: bool,
}

#[derive(Serialize)]
struct ComponentStacktraceJson {
    frames: Vec<ComponentStackFrameJson>,
}

#[derive(Serialize)]
struct ComponentStackFrameJson {
    function: String,
    filename: Option<String>,
    lineno: Option<u64>,
    colno: Option<u64>,
    abs_path: Option<String>,
    in_app: bool,
}

#[derive(Clone)]
struct CachedSourceMap {
    map: Arc<SourceMap>,
    estimated_bytes: u64,
}

#[derive(Clone, Copy)]
struct ParsedSourceMapWeighter;

impl quick_cache::Weighter<String, Arc<CachedSourceMap>> for ParsedSourceMapWeighter {
    fn weight(&self, key: &String, value: &Arc<CachedSourceMap>) -> u64 {
        key.len() as u64 + value.estimated_bytes
    }
}

type ParsedSourceMapCache = Cache<String, Arc<CachedSourceMap>, ParsedSourceMapWeighter>;

pub(crate) struct Resolver {
    base_url: Option<url::Url>,
    client: reqwest::Client,
    parsed_cache: ParsedSourceMapCache,
    file_cache_path: PathBuf,
    file_cache_capacity: usize,
}

impl Resolver {
    pub(crate) async fn new(config: Config) -> anyhow::Result<Self> {
        let client = crate::http_client::builder()
            .build()
            .expect("source map HTTP client configuration is valid");
        let file_cache_capacity = config
            .source_map_cache_bytes
            .saturating_mul(config.source_map_disk_cache_ratio);
        let file_cache_enabled = config.source_map_base_url.is_some() && file_cache_capacity > 0;
        if file_cache_enabled {
            std::fs::create_dir_all(&config.source_map_disk_cache_path)?;
            start_file_cache_cleanup(
                config.source_map_disk_cache_path.clone(),
                file_cache_capacity,
            );
        }
        Ok(Self {
            base_url: config.source_map_base_url.map(normalize_base_url),
            client,
            parsed_cache: Cache::with_weighter(
                config.source_map_cache_bytes,
                config.source_map_cache_bytes as u64,
                ParsedSourceMapWeighter,
            ),
            file_cache_path: config.source_map_disk_cache_path,
            file_cache_capacity: if file_cache_enabled {
                file_cache_capacity
            } else {
                0
            },
        })
    }

    pub(crate) async fn stacktrace<'a>(
        &self,
        app_name: &str,
        frames: Option<impl IntoIterator<Item = StackFrame<'a>>>,
    ) -> SymbolicatedStacktrace {
        let Some(frames) = frames else {
            return SymbolicatedStacktrace {
                stacktrace: String::new(),
                raw_stacktrace: String::new(),
                status: "not_applicable",
            };
        };
        let frames = frames.into_iter().collect::<Vec<_>>();
        if frames.is_empty() {
            return SymbolicatedStacktrace {
                stacktrace: String::new(),
                raw_stacktrace: String::new(),
                status: "not_applicable",
            };
        }

        let raw_stacktrace = raw_stacktrace_json(&frames);
        let mut sentry_frames = Vec::with_capacity(frames.len());
        let mut applicable = false;
        let mut symbolicated = false;
        let mut failed = false;

        for frame in &frames {
            let Some(source_map_key) = source_map_key(app_name, frame.filename) else {
                sentry_frames.push(generated_sentry_frame(frame, false));
                continue;
            };
            applicable = true;
            let symbolicated_frame = if self.base_url.is_some() {
                match self.source_map(&source_map_key).await {
                    Ok(source_map) => symbolize_frame(&source_map, frame),
                    Err(error) => {
                        failed = true;
                        tracing::debug!(
                            event = "frontend.telemetry.sourcemap_failed",
                            source_map_key,
                            %error,
                            "Failed to load source map"
                        );
                        None
                    }
                }
            } else {
                None
            };
            if let Some(symbolicated_frame) = symbolicated_frame {
                symbolicated = true;
                sentry_frames.push(symbolicated_frame);
            } else {
                sentry_frames.push(generated_sentry_frame(frame, true));
            }
        }

        let status = if self.base_url.is_none() {
            "disabled"
        } else if symbolicated {
            "symbolicated"
        } else if failed {
            "failed"
        } else if applicable {
            "missing"
        } else {
            "not_applicable"
        };
        SymbolicatedStacktrace {
            stacktrace: sentry_stacktrace_json(sentry_frames),
            raw_stacktrace,
            status,
        }
    }

    pub(crate) async fn component_stack(
        &self,
        app_name: &str,
        component_stack: &str,
    ) -> SymbolicatedComponentStack {
        let raw_component_stack = component_stack.to_owned();
        let mut frames = Vec::new();
        let mut applicable = false;
        let mut symbolicated = false;
        let mut failed = false;

        for line in component_stack.split('\n') {
            let line = line.strip_suffix('\r').unwrap_or(line);
            let Some(frame) = parse_component_stack_frame(line) else {
                continue;
            };
            let Some(filename) = frame.filename else {
                frames.push(generated_component_frame(&frame, false));
                continue;
            };
            let (Some(lineno), Some(colno)) = (frame.lineno, frame.colno) else {
                frames.push(generated_component_frame(&frame, false));
                continue;
            };
            let Some(source_map_key) = source_map_key(app_name, filename) else {
                frames.push(generated_component_frame(&frame, false));
                continue;
            };
            applicable = true;

            let symbolicated_frame = if self.base_url.is_some() {
                match self.source_map(&source_map_key).await {
                    Ok(source_map) => symbolize_frame(
                        &source_map,
                        &StackFrame {
                            filename,
                            function: frame.function,
                            lineno: Some(lineno),
                            colno: Some(colno),
                        },
                    ),
                    Err(error) => {
                        failed = true;
                        tracing::debug!(
                            event = "frontend.telemetry.sourcemap_failed",
                            source_map_key,
                            %error,
                            "Failed to load source map"
                        );
                        None
                    }
                }
            } else {
                None
            };

            let Some(symbolicated_frame) = symbolicated_frame else {
                frames.push(generated_component_frame(&frame, true));
                continue;
            };
            symbolicated = true;
            frames.push(ComponentStackFrameJson {
                function: symbolicated_frame.function,
                filename: Some(symbolicated_frame.filename),
                lineno: Some(symbolicated_frame.lineno),
                colno: Some(symbolicated_frame.colno),
                abs_path: symbolicated_frame.abs_path,
                in_app: symbolicated_frame.in_app,
            });
        }

        let status = if self.base_url.is_none() {
            "disabled"
        } else if symbolicated {
            "symbolicated"
        } else if failed {
            "failed"
        } else if applicable {
            "missing"
        } else {
            "not_applicable"
        };
        SymbolicatedComponentStack {
            component_stacktrace: serde_json::to_string(&ComponentStacktraceJson { frames })
                .unwrap_or_default(),
            raw_component_stack,
            status,
        }
    }

    async fn source_map(&self, key: &str) -> anyhow::Result<Arc<SourceMap>> {
        if let Some(cached) = self.parsed_cache.get(key) {
            return Ok(cached.map.clone());
        }

        let bytes = if self.file_cache_capacity > 0 {
            match read_cached_source_map(&self.file_cache_path, key).await? {
                Some(bytes) => bytes,
                None => self.fetch_and_cache_source_map(key).await?,
            }
        } else {
            self.fetch_source_map(key).await?
        };
        let parsed = parse_source_map(bytes).await?;
        self.parsed_cache.insert(key.to_owned(), parsed.clone());
        Ok(parsed.map.clone())
    }

    async fn fetch_and_cache_source_map(&self, key: &str) -> anyhow::Result<Vec<u8>> {
        let bytes = self.fetch_source_map(key).await?;
        if let Err(error) = write_cached_source_map(&self.file_cache_path, key, &bytes).await {
            tracing::debug!(
                event = "frontend.telemetry.sourcemap_cache_write_failed",
                key,
                %error,
                "Failed to write source map file cache"
            );
        }
        Ok(bytes)
    }

    async fn fetch_source_map(&self, key: &str) -> anyhow::Result<Vec<u8>> {
        let Some(base_url) = &self.base_url else {
            unreachable!("source_map is only called when source maps are enabled");
        };
        let url = base_url.join(key).map_err(source_map_error)?;
        fetch_source_map_bytes(self.client.clone(), url).await
    }
}

fn start_file_cache_cleanup(root: PathBuf, capacity: usize) {
    tokio::spawn(async move {
        cleanup_file_cache(root.clone(), capacity).await;
        let mut interval = tokio::time::interval(FILE_CACHE_CLEANUP_INTERVAL);
        loop {
            interval.tick().await;
            cleanup_file_cache(root.clone(), capacity).await;
        }
    });
}

async fn cleanup_file_cache(root: PathBuf, capacity: usize) {
    if let Err(error) =
        tokio::task::spawn_blocking(move || cleanup_file_cache_sync(&root, capacity))
            .await
            .map_err(source_map_error)
            .and_then(|result| result)
    {
        tracing::debug!(
            event = "frontend.telemetry.sourcemap_cache_cleanup_failed",
            %error,
            "Failed to clean source map file cache"
        );
    }
}

#[derive(Debug)]
struct CacheFile {
    path: PathBuf,
    size: u64,
    modified: SystemTime,
}

fn cleanup_file_cache_sync(root: &Path, capacity: usize) -> anyhow::Result<()> {
    let mut files = Vec::new();
    collect_cache_files(root, &mut files)?;
    let total_size = files
        .iter()
        .map(|file| file.size)
        .fold(0u64, u64::saturating_add);
    let capacity = capacity as u64;
    if total_size <= capacity {
        return Ok(());
    }

    let target_size = capacity.saturating_mul(FILE_CACHE_CLEANUP_TARGET_RATIO as u64) / 100;
    files.sort_by_key(|file| file.modified);
    let mut current_size = total_size;
    for file in files {
        if current_size <= target_size {
            break;
        }
        match std::fs::remove_file(&file.path) {
            Ok(()) => current_size = current_size.saturating_sub(file.size),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                current_size = current_size.saturating_sub(file.size);
            }
            Err(error) => return Err(source_map_error(error)),
        }
    }
    Ok(())
}

fn collect_cache_files(root: &Path, output: &mut Vec<CacheFile>) -> anyhow::Result<()> {
    let entries = match std::fs::read_dir(root) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(source_map_error(error)),
    };
    for entry in entries {
        let entry = entry.map_err(source_map_error)?;
        let metadata = entry.metadata().map_err(source_map_error)?;
        if metadata.is_dir() {
            collect_cache_files(&entry.path(), output)?;
        } else if metadata.is_file() {
            output.push(CacheFile {
                path: entry.path(),
                size: metadata.len(),
                modified: metadata.modified().unwrap_or(SystemTime::UNIX_EPOCH),
            });
        }
    }
    Ok(())
}

async fn read_cached_source_map(root: &Path, key: &str) -> anyhow::Result<Option<Vec<u8>>> {
    let path = cache_file_path(root, key)?;
    match tokio::fs::read(&path).await {
        Ok(bytes) => {
            touch_cache_file(path).await;
            Ok(Some(bytes))
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(source_map_error(error)),
    }
}

async fn touch_cache_file(path: PathBuf) {
    tokio::spawn(async move {
        let Ok(metadata) = tokio::fs::metadata(&path).await else {
            return;
        };
        let Ok(file) = tokio::fs::OpenOptions::new().write(true).open(&path).await else {
            return;
        };
        let _ = file.set_len(metadata.len()).await;
    });
}

async fn write_cached_source_map(root: &Path, key: &str, bytes: &[u8]) -> anyhow::Result<()> {
    let path = cache_file_path(root, key)?;
    let parent = path
        .parent()
        .ok_or_else(|| source_map_error("source map cache path has no parent"))?;
    tokio::fs::create_dir_all(parent)
        .await
        .map_err(source_map_error)?;
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| source_map_error("source map cache path has no file name"))?;
    let temporary_path = parent.join(format!(
        ".{file_name}.tmp-{}-{}",
        std::process::id(),
        uuid::Uuid::new_v4()
    ));
    tokio::fs::write(&temporary_path, bytes)
        .await
        .map_err(source_map_error)?;
    if let Err(error) = tokio::fs::rename(&temporary_path, &path).await {
        let _ = tokio::fs::remove_file(&temporary_path).await;
        return Err(source_map_error(error));
    }
    Ok(())
}

fn cache_file_path(root: &Path, key: &str) -> anyhow::Result<PathBuf> {
    let relative = Path::new(key);
    if relative.is_absolute()
        || relative.components().any(|component| {
            !matches!(
                component,
                std::path::Component::Normal(_) | std::path::Component::CurDir
            )
        })
    {
        return Err(source_map_error("invalid source map cache key"));
    }
    Ok(root.join(relative))
}

fn normalize_base_url(mut url: url::Url) -> url::Url {
    if !url.path().ends_with('/') {
        url.set_path(&format!("{}/", url.path()));
    }
    url.set_query(None);
    url.set_fragment(None);
    url
}

fn raw_stacktrace_json(frames: &[StackFrame<'_>]) -> String {
    serde_json::to_string(&FaroStacktraceJson {
        frames: frames
            .iter()
            .map(|frame| FaroStackFrameJson {
                filename: frame.filename,
                function: frame.function,
                lineno: frame.lineno,
                colno: frame.colno,
            })
            .collect(),
    })
    .unwrap_or_default()
}

fn sentry_stacktrace_json(frames: Vec<SentryStackFrameJson>) -> String {
    serde_json::to_string(&SentryStacktraceJson { frames }).unwrap_or_default()
}

fn source_map_error(error: impl std::fmt::Display) -> anyhow::Error {
    anyhow::anyhow!(error.to_string())
}

async fn fetch_source_map_bytes(client: reqwest::Client, url: url::Url) -> anyhow::Result<Vec<u8>> {
    let bytes = client
        .get(url)
        .send()
        .await
        .map_err(source_map_error)?
        .error_for_status()
        .map_err(source_map_error)?
        .bytes()
        .await
        .map_err(source_map_error)?;
    Ok(bytes.to_vec())
}

async fn parse_source_map(bytes: Vec<u8>) -> anyhow::Result<Arc<CachedSourceMap>> {
    tokio::task::spawn_blocking(move || -> Result<Arc<CachedSourceMap>, sourcemap::Error> {
        let source_map = SourceMap::from_slice(&bytes)?;
        let estimated_bytes = estimate_source_map_bytes(&source_map);
        Ok(Arc::new(CachedSourceMap {
            map: Arc::new(source_map),
            estimated_bytes,
        }))
    })
    .await
    .map_err(source_map_error)?
    .map_err(source_map_error)
}

fn estimate_source_map_bytes(source_map: &SourceMap) -> u64 {
    let token_bytes = u64::from(source_map.get_token_count())
        .saturating_mul(std::mem::size_of::<sourcemap::RawToken>() as u64);
    let sources_bytes = (0..source_map.get_source_count())
        .filter_map(|index| source_map.get_source(index))
        .map(|source| source.len() as u64)
        .sum::<u64>();
    let source_contents_bytes = (0..source_map.get_source_count())
        .filter_map(|index| source_map.get_source_contents(index))
        .map(|source| source.len() as u64)
        .sum::<u64>();
    let names_bytes = (0..source_map.get_name_count())
        .filter_map(|index| source_map.get_name(index))
        .map(|name| name.len() as u64)
        .sum::<u64>();
    token_bytes
        .saturating_add(sources_bytes)
        .saturating_add(source_contents_bytes)
        .saturating_add(names_bytes)
}

fn source_map_key(app_name: &str, filename: &str) -> Option<String> {
    let url = url::Url::parse(filename).ok()?;
    let path = url.path();
    if !(path.contains("/_next/static/") || path.contains("/assets/")) || !path.ends_with(".js") {
        return None;
    }
    let app_prefix = match app_name {
        "legacy" | "spa" | "site" => app_name,
        _ => return None,
    };
    Some(format!("{app_prefix}/{}.map", path.trim_start_matches('/')))
}

fn symbolize_frame(source_map: &SourceMap, frame: &StackFrame<'_>) -> Option<SentryStackFrameJson> {
    let line = frame.lineno?.checked_sub(1)?;
    let column = frame.colno?.checked_sub(1)?;
    let token = source_map.lookup_token(line as u32, column as u32)?;
    let source = token.get_source()?;
    Some(SentryStackFrameJson {
        filename: source.to_owned(),
        function: token.get_name().unwrap_or(frame.function).to_owned(),
        lineno: u64::from(token.get_src_line()) + 1,
        colno: u64::from(token.get_src_col()) + 1,
        abs_path: Some(frame.filename.to_owned()),
        in_app: true,
    })
}

fn generated_sentry_frame(frame: &StackFrame<'_>, in_app: bool) -> SentryStackFrameJson {
    SentryStackFrameJson {
        filename: frame.filename.to_owned(),
        function: frame.function.to_owned(),
        lineno: frame.lineno.unwrap_or_default(),
        colno: frame.colno.unwrap_or_default(),
        abs_path: Some(frame.filename.to_owned()),
        in_app,
    }
}

fn parse_component_stack_frame(line: &str) -> Option<ComponentStackFrame<'_>> {
    let leading_whitespace = line.len().saturating_sub(line.trim_start().len());
    let rest = line[leading_whitespace..].strip_prefix("at ")?;

    if let Some(function_end) = rest.rfind(" (")
        && rest.ends_with(')')
    {
        let function = &rest[..function_end];
        let location = &rest[function_end + 2..rest.len() - 1];
        if let Some((filename, lineno, colno)) = parse_component_stack_location(location) {
            return Some(ComponentStackFrame {
                function,
                filename: Some(filename),
                lineno: Some(lineno),
                colno: Some(colno),
            });
        }
        return Some(ComponentStackFrame {
            function,
            filename: None,
            lineno: None,
            colno: None,
        });
    }

    if let Some((filename, lineno, colno)) = parse_component_stack_location(rest) {
        return Some(ComponentStackFrame {
            function: "",
            filename: Some(filename),
            lineno: Some(lineno),
            colno: Some(colno),
        });
    }

    Some(ComponentStackFrame {
        function: rest,
        filename: None,
        lineno: None,
        colno: None,
    })
}

fn parse_component_stack_location(location: &str) -> Option<(&str, u64, u64)> {
    let (location, colno) = location.rsplit_once(':')?;
    let (filename, lineno) = location.rsplit_once(':')?;
    Some((filename, lineno.parse().ok()?, colno.parse().ok()?))
}

fn generated_component_frame(
    frame: &ComponentStackFrame<'_>,
    in_app: bool,
) -> ComponentStackFrameJson {
    ComponentStackFrameJson {
        function: frame.function.to_owned(),
        filename: frame.filename.map(str::to_owned),
        lineno: frame.lineno,
        colno: frame.colno,
        abs_path: frame.filename.map(str::to_owned),
        in_app,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_react_component_stack_frames() {
        let frame = parse_component_stack_frame(
            "    at Chat (https://example.com/_next/static/chunks/app.js:12:34)",
        )
        .unwrap();
        assert_eq!(frame.function, "Chat");
        assert_eq!(
            frame.filename,
            Some("https://example.com/_next/static/chunks/app.js")
        );
        assert_eq!(frame.lineno, Some(12));
        assert_eq!(frame.colno, Some(34));

        let frame =
            parse_component_stack_frame("    at https://example.com/assets/app.js:5:6").unwrap();
        assert_eq!(frame.function, "");
        assert_eq!(frame.filename, Some("https://example.com/assets/app.js"));
        assert_eq!(frame.lineno, Some(5));
        assert_eq!(frame.colno, Some(6));
    }

    #[test]
    fn parses_component_stack_frames_without_locations() {
        let frame = parse_component_stack_frame("    at div").unwrap();
        assert_eq!(frame.function, "div");
        assert_eq!(frame.filename, None);

        let frame = parse_component_stack_frame("    at Chat (<anonymous>)").unwrap();
        assert_eq!(frame.function, "Chat");
        assert_eq!(frame.filename, None);

        assert!(parse_component_stack_frame("not a component stack frame").is_none());
    }

    #[tokio::test]
    async fn preserves_component_stack_when_symbolication_is_disabled() {
        let resolver = Resolver::new(Config::default()).await.unwrap();
        let raw =
            "\n    at Chat (https://example.com/_next/static/chunks/app.js:12:34)\n    at div";
        let result = resolver.component_stack("spa", raw).await;
        let stacktrace: serde_json::Value =
            serde_json::from_str(&result.component_stacktrace).unwrap();

        assert_eq!(
            stacktrace["frames"][0]["function"],
            serde_json::Value::String("Chat".to_owned())
        );
        assert_eq!(
            stacktrace["frames"][0]["filename"],
            serde_json::Value::String("https://example.com/_next/static/chunks/app.js".to_owned())
        );
        assert_eq!(
            stacktrace["frames"][1]["function"],
            serde_json::Value::String("div".to_owned())
        );
        assert_eq!(result.raw_component_stack, raw);
        assert_eq!(result.status, "disabled");
    }
}
