use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use anyhow::{Context, Result, anyhow, ensure};
use eframe::egui::{self, Color32, Vec2};
use once_cell::sync::Lazy;

static EMPTY_THEME_VALUES: Lazy<BTreeMap<String, String>> = Lazy::new(|| BTreeMap::new());
static REPO_ROOT: Lazy<PathBuf> = Lazy::new(|| Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."));
const THEME_FILE_RELATIVE: &str = "packages/tailwind-config/theme.tailwind.css";
const SEARCH_GLOBS: &[&str] = &["*.ts", "*.tsx", "*.html", "*.htm"];

fn main() -> eframe::Result {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default().with_inner_size([960.0, 640.0]),
        ..Default::default()
    };

    eframe::run_native(
        "Theme Designer",
        options,
        Box::new(|_cc| Ok(Box::new(ThemeDesigner::init()))),
    )
}

struct ThemeDesigner {
    theme_file: ThemeFile,
    theme_names: Vec<String>,
    variable_rows: Vec<VariableRow>,
    new_var_name: String,
    new_var_values: BTreeMap<String, String>,
    dirty: bool,
    status_message: Option<String>,
    error_message: Option<String>,
}

impl ThemeDesigner {
    fn init() -> Self {
        match Self::load_from_disk() {
            Ok(app) => app,
            Err(err) => {
                let mut designer = ThemeDesigner {
                    theme_file: ThemeFile::empty(default_theme_file_path()),
                    theme_names: Vec::new(),
                    variable_rows: Vec::new(),
                    new_var_name: String::new(),
                    new_var_values: BTreeMap::new(),
                    dirty: false,
                    status_message: None,
                    error_message: Some(err.to_string()),
                };
                designer.ensure_new_var_placeholders();
                designer
            }
        }
    }

    fn load_from_disk() -> Result<Self> {
        let path = default_theme_file_path();
        let theme_file = ThemeFile::load(&path)?;
        let (theme_names, variable_rows) = theme_file.collect_rows();

        let mut designer = ThemeDesigner {
            theme_file,
            theme_names,
            variable_rows,
            new_var_name: String::new(),
            new_var_values: BTreeMap::new(),
            dirty: false,
            status_message: None,
            error_message: None,
        };

        designer.ensure_new_var_placeholders();
        Ok(designer)
    }

    fn ensure_new_var_placeholders(&mut self) {
        for theme in &self.theme_names {
            self.new_var_values
                .entry(theme.clone())
                .or_insert_with(String::new);
        }
    }

    fn reload_from_disk(&mut self) -> Result<()> {
        let path = self.theme_file.path.clone();
        let theme_file = ThemeFile::load(&path)?;
        let (theme_names, variable_rows) = theme_file.collect_rows();

        self.theme_file = theme_file;
        self.theme_names = theme_names;
        self.variable_rows = variable_rows;
        self.new_var_name.clear();
        self.new_var_values.clear();
        self.ensure_new_var_placeholders();
        self.dirty = false;
        Ok(())
    }

    fn add_variable(&mut self) {
        self.error_message = None;
        self.status_message = None;

        let mut name = self.new_var_name.trim().to_string();
        if name.is_empty() {
            self.error_message = Some("Variable name cannot be empty.".to_owned());
            return;
        }

        if !name.starts_with("--") {
            name = format!("--{}", name.trim_start_matches('-'));
        }

        if self
            .variable_rows
            .iter()
            .any(|row| row.name.eq_ignore_ascii_case(&name))
        {
            self.error_message = Some(format!("Variable {name} already exists."));
            return;
        }

        let mut values = BTreeMap::new();
        for theme in &self.theme_names {
            let value = self
                .new_var_values
                .get(theme)
                .map(|v| v.trim().to_owned())
                .unwrap_or_default();
            values.insert(theme.clone(), value);
        }

        self.variable_rows.push(VariableRow {
            name: name.clone(),
            values,
            usage_count: None,
        });
        self.dirty = true;
        self.status_message = Some(format!("Added {name}."));
        self.new_var_name.clear();
        for value in self.new_var_values.values_mut() {
            value.clear();
        }
    }

    fn save(&mut self) {
        self.error_message = None;
        self.status_message = None;

        if self.theme_names.is_empty() {
            self.error_message = Some("No themes were found to save.".to_owned());
            return;
        }

        let order: Vec<String> = self
            .variable_rows
            .iter()
            .map(|row| row.name.clone())
            .collect();

        let mut theme_values: BTreeMap<String, BTreeMap<String, String>> = BTreeMap::new();
        for theme in &self.theme_names {
            theme_values.insert(theme.clone(), BTreeMap::new());
        }

        for row in &self.variable_rows {
            for theme in &self.theme_names {
                if let Some(theme_map) = theme_values.get_mut(theme) {
                    let value = row.values.get(theme).map(|v| v.trim()).unwrap_or_default();
                    if !value.is_empty() {
                        theme_map.insert(row.name.clone(), value.to_owned());
                    } else {
                        theme_map.remove(&row.name);
                    }
                }
            }
        }

        let result = (|| -> Result<()> {
            self.theme_file.apply(&theme_values, &order)?;
            self.theme_file.write()?;
            Ok(())
        })();

        match result {
            Ok(()) => {
                self.dirty = false;
                match self.reload_from_disk() {
                    Ok(()) => {
                        self.status_message = Some("Saved theme file.".to_owned());
                        self.error_message = None;
                    }
                    Err(err) => {
                        self.error_message = Some(format!("Saved but reload failed: {err}"));
                    }
                }
            }
            Err(err) => {
                self.error_message = Some(err.to_string());
            }
        }
    }

    fn update_usage_stats(&mut self) {
        self.status_message = None;
        self.error_message = None;

        let names: Vec<String> = self
            .variable_rows
            .iter()
            .map(|row| row.name.clone())
            .collect();

        match compute_usage_counts(&names) {
            Ok(count_map) => {
                for row in &mut self.variable_rows {
                    row.usage_count = count_map.get(&row.name).copied();
                }
                self.status_message = Some("Usage statistics updated.".to_owned());
            }
            Err(err) => {
                self.error_message = Some(err.to_string());
            }
        }
    }
}

impl eframe::App for ThemeDesigner {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        egui::TopBottomPanel::top("top_controls").show(ctx, |ui| {
            ui.horizontal(|ui| {
                if ui.button("Update Stats").clicked() {
                    self.update_usage_stats();
                }

                if ui.button("Reload").clicked() {
                    match self.reload_from_disk() {
                        Ok(()) => {
                            self.status_message = Some("Reloaded from disk.".to_owned());
                            self.error_message = None;
                        }
                        Err(err) => {
                            self.error_message = Some(err.to_string());
                        }
                    }
                }

                if ui
                    .add_enabled(self.dirty, egui::Button::new("Save"))
                    .clicked()
                {
                    self.save();
                }

                if self.dirty {
                    ui.label(egui::RichText::new("Unsaved changes").color(Color32::YELLOW));
                }

                ui.separator();
                ui.label(format!("File: {}", self.theme_file.path.display()));
            });

            if let Some(error) = &self.error_message {
                ui.add_space(4.0);
                ui.horizontal(|ui| {
                    ui.colored_label(Color32::from_rgb(0xFF, 0x55, 0x55), "Error");
                    ui.label(error);
                });
            } else if let Some(status) = &self.status_message {
                ui.add_space(4.0);
                ui.horizontal(|ui| {
                    ui.colored_label(Color32::from_rgb(0x55, 0xAA, 0x55), "Status");
                    ui.label(status);
                });
            }
        });

        egui::CentralPanel::default().show(ctx, |ui| {
            egui::ScrollArea::vertical().show(ui, |ui| {
                egui::Grid::new("theme_grid")
                    .striped(true)
                    .spacing([16.0, 8.0])
                    .show(ui, |ui| {
                        ui.strong("Usage");
                        ui.strong("Variable");
                        for theme in &self.theme_names {
                            ui.strong(theme);
                        }
                        ui.end_row();

                        let mut idx = 0;
                        while idx < self.variable_rows.len() {
                            let usage_text = self.variable_rows[idx]
                                .usage_count
                                .map(|count| count.to_string())
                                .unwrap_or_else(|| "-".to_owned());
                            let row_name = self.variable_rows[idx].name.clone();

                            ui.label(usage_text.as_str());
                            ui.label(row_name.as_str());

                            let remove_row = {
                                let variable = &mut self.variable_rows[idx];
                                let mut empty_for_all = true;
                                for theme in &self.theme_names {
                                    let value = variable
                                        .values
                                        .entry(theme.clone())
                                        .or_insert_with(String::new);
                                    let response = ui.add_sized(
                                        Vec2::new(320.0, 0.0),
                                        egui::TextEdit::singleline(value),
                                    );
                                    if response.changed() {
                                        self.dirty = true;
                                    }

                                    if value.trim().is_empty() {
                                        variable.values.insert(theme.clone(), String::new());
                                    } else {
                                        empty_for_all = false;
                                    }
                                }
                                empty_for_all
                            };

                            ui.end_row();

                            if remove_row {
                                self.variable_rows.remove(idx);
                                self.dirty = true;
                                continue;
                            }

                            idx += 1;
                        }
                    });

                ui.separator();

                ui.heading("Add variable");
                ui.horizontal(|ui| {
                    ui.label("Name");
                    ui.add_sized(
                        Vec2::new(240.0, 0.0),
                        egui::TextEdit::singleline(&mut self.new_var_name),
                    );
                });

                for theme in &self.theme_names {
                    ui.horizontal(|ui| {
                        ui.label(format!("{theme} value"));
                        let entry = self
                            .new_var_values
                            .entry(theme.clone())
                            .or_insert_with(String::new);
                        ui.add_sized(Vec2::new(320.0, 0.0), egui::TextEdit::singleline(entry));
                    });
                }

                if ui.button("Add").clicked() {
                    self.add_variable();
                }
            });
        });
    }
}

#[derive(Clone)]
struct VariableRow {
    name: String,
    values: BTreeMap<String, String>,
    usage_count: Option<usize>,
}

struct ThemeFile {
    path: PathBuf,
    chunks: Vec<FileChunk>,
}

impl ThemeFile {
    fn empty(path: PathBuf) -> Self {
        Self {
            path,
            chunks: Vec::new(),
        }
    }

    fn load(path: &Path) -> Result<Self> {
        let contents = fs::read_to_string(path)
            .with_context(|| format!("Failed to read {}", path.display()))?;
        let lines: Vec<String> = contents.lines().map(|line| line.to_owned()).collect();

        let mut idx = 0;
        let mut chunks: Vec<FileChunk> = Vec::new();
        let mut raw_buffer: Vec<String> = Vec::new();

        while idx < lines.len() {
            if is_theme_header_start(&lines, idx) {
                if !raw_buffer.is_empty() {
                    chunks.push(FileChunk::Raw(raw_buffer.clone()));
                    raw_buffer.clear();
                }

                let (header_lines, next_idx) = collect_header(&lines, idx);
                idx = next_idx;

                let (body_lines, closing_line, new_idx) = collect_body(&lines, idx);
                idx = new_idx;

                let block = ThemeBlock::parse(header_lines, body_lines, closing_line)?;
                chunks.push(FileChunk::Theme(block));
            } else {
                raw_buffer.push(lines[idx].clone());
                idx += 1;
            }
        }

        if !raw_buffer.is_empty() {
            chunks.push(FileChunk::Raw(raw_buffer));
        }

        Ok(Self {
            path: path.to_owned(),
            chunks,
        })
    }

    fn collect_rows(&self) -> (Vec<String>, Vec<VariableRow>) {
        let theme_blocks: Vec<&ThemeBlock> = self
            .chunks
            .iter()
            .filter_map(|chunk| match chunk {
                FileChunk::Theme(block) => Some(block),
                _ => None,
            })
            .collect();

        let theme_names: Vec<String> = theme_blocks
            .iter()
            .map(|block| block.theme_name.clone())
            .collect();

        let mut order: Vec<String> = Vec::new();
        let mut order_set: BTreeSet<String> = BTreeSet::new();

        if let Some(first_block) = theme_blocks.first() {
            for name in first_block.variable_names() {
                if order_set.insert(name.clone()) {
                    order.push(name.clone());
                }
            }
        }

        let mut values_map: BTreeMap<String, BTreeMap<String, String>> = BTreeMap::new();

        for block in &theme_blocks {
            for variable in block.variables() {
                values_map
                    .entry(variable.name.clone())
                    .or_default()
                    .insert(block.theme_name.clone(), variable.value.clone());

                if order_set.insert(variable.name.clone()) {
                    order.push(variable.name.clone());
                }
            }
        }

        let mut rows: Vec<VariableRow> = Vec::new();

        for name in &order {
            let mut values = BTreeMap::new();
            for theme in &theme_names {
                let value = values_map
                    .get(name)
                    .and_then(|map| map.get(theme))
                    .cloned()
                    .unwrap_or_default();
                values.insert(theme.clone(), value);
            }
            rows.push(VariableRow {
                name: name.clone(),
                values,
                usage_count: None,
            });
        }

        (theme_names, rows)
    }

    fn apply(
        &mut self,
        theme_values: &BTreeMap<String, BTreeMap<String, String>>,
        order: &[String],
    ) -> Result<()> {
        for chunk in &mut self.chunks {
            if let FileChunk::Theme(block) = chunk {
                let values = theme_values
                    .get(&block.theme_name)
                    .unwrap_or(&EMPTY_THEME_VALUES);
                block.apply(values, order)?;
            }
        }
        Ok(())
    }

    fn write(&self) -> Result<()> {
        let mut contents = String::new();

        for chunk in &self.chunks {
            match chunk {
                FileChunk::Raw(lines) => {
                    for line in lines {
                        contents.push_str(line);
                        contents.push('\n');
                    }
                }
                FileChunk::Theme(block) => {
                    for line in &block.header_lines {
                        contents.push_str(line);
                        contents.push('\n');
                    }
                    for item in &block.items {
                        match item {
                            BlockItem::Raw(line) => {
                                contents.push_str(line);
                                contents.push('\n');
                            }
                            BlockItem::Variable(var) => {
                                for rendered in var.render_lines() {
                                    contents.push_str(&rendered);
                                    contents.push('\n');
                                }
                            }
                        }
                    }
                    contents.push_str(&block.closing_line);
                    contents.push('\n');
                }
            }
        }

        fs::write(&self.path, contents)
            .with_context(|| format!("Failed to write {}", self.path.display()))?;
        Ok(())
    }
}

enum FileChunk {
    Theme(ThemeBlock),
    Raw(Vec<String>),
}

struct ThemeBlock {
    header_lines: Vec<String>,
    items: Vec<BlockItem>,
    closing_line: String,
    theme_name: String,
}

impl ThemeBlock {
    fn parse(
        header_lines: Vec<String>,
        body_lines: Vec<String>,
        closing_line: String,
    ) -> Result<Self> {
        let theme_name = extract_theme_name(&header_lines);
        let items = parse_block_items(body_lines)?;

        Ok(Self {
            header_lines,
            items,
            closing_line,
            theme_name,
        })
    }

    fn variable_names(&self) -> Vec<String> {
        self.items
            .iter()
            .filter_map(|item| match item {
                BlockItem::Variable(var) => Some(var.name.clone()),
                _ => None,
            })
            .collect()
    }

    fn variables(&self) -> Vec<&VariableLine> {
        self.items
            .iter()
            .filter_map(|item| match item {
                BlockItem::Variable(var) => Some(var),
                _ => None,
            })
            .collect()
    }

    fn apply(&mut self, theme_values: &BTreeMap<String, String>, order: &[String]) -> Result<()> {
        use std::collections::HashSet;
        let mut seen: HashSet<String> = HashSet::new();

        self.items.retain(|item| match item {
            BlockItem::Variable(var) => {
                if theme_values.contains_key(&var.name) {
                    true
                } else {
                    false
                }
            }
            _ => true,
        });

        for item in &mut self.items {
            if let BlockItem::Variable(var) = item {
                if let Some(new_value) = theme_values.get(&var.name) {
                    var.set_value(new_value);
                    seen.insert(var.name.clone());
                }
            }
        }

        for name in order {
            if seen.contains(name) {
                continue;
            }

            if let Some(value) = theme_values.get(name) {
                self.insert_variable(name.clone(), value.clone());
                seen.insert(name.clone());
            }
        }

        Ok(())
    }

    fn insert_variable(&mut self, name: String, value: String) {
        let indent = self
            .items
            .iter()
            .find_map(|item| match item {
                BlockItem::Variable(var) => Some(var.leading.clone()),
                _ => None,
            })
            .unwrap_or_else(|| "  ".to_owned());

        let new_variable = VariableLine::new(indent, name, value);
        let insert_idx = self
            .items
            .iter()
            .rposition(|item| matches!(item, BlockItem::Variable(_)))
            .map(|idx| idx + 1)
            .unwrap_or_else(|| self.items.len());

        self.items
            .insert(insert_idx, BlockItem::Variable(new_variable));
    }
}

enum BlockItem {
    Variable(VariableLine),
    Raw(String),
}

#[derive(Clone)]
struct VariableLine {
    leading: String,
    name: String,
    value: String,
    trailing: String,
    raw_lines: Vec<String>,
    dirty: bool,
}

impl VariableLine {
    fn new(leading: String, name: String, value: String) -> Self {
        Self {
            leading,
            name,
            value: value.trim().to_owned(),
            trailing: String::new(),
            raw_lines: Vec::new(),
            dirty: true,
        }
    }

    fn set_value(&mut self, new_value: &str) {
        let trimmed = new_value.trim();
        if trimmed != self.value {
            self.value = trimmed.to_owned();
            self.dirty = true;
        }
    }

    fn render_lines(&self) -> Vec<String> {
        if !self.dirty && !self.raw_lines.is_empty() {
            return self.raw_lines.clone();
        }

        let mut line = format!("{}{}: {}", self.leading, self.name, self.value);
        if !line.trim_end().ends_with(';') {
            line.push(';');
        }
        if !self.trailing.is_empty() {
            line.push_str(&self.trailing);
        }
        vec![line]
    }
}

fn default_theme_file_path() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../packages/tailwind-config/theme.tailwind.css")
}

fn repo_root() -> &'static Path {
    &REPO_ROOT
}

fn is_theme_header_start(lines: &[String], idx: usize) -> bool {
    let trimmed = lines[idx].trim_start();
    if trimmed.starts_with("@theme") {
        return true;
    }
    if trimmed.contains("data-theme=") {
        return true;
    }
    if trimmed.starts_with('.') || trimmed.starts_with('[') {
        for lookahead in idx..(idx + 3).min(lines.len()) {
            if lines[lookahead].contains("data-theme=") {
                return true;
            }
            if lines[lookahead].contains('{') {
                break;
            }
        }
    }
    false
}

fn collect_header(lines: &[String], mut idx: usize) -> (Vec<String>, usize) {
    let mut header = Vec::new();
    while idx < lines.len() {
        let current = lines[idx].clone();
        header.push(current.clone());
        if current.contains('{') {
            idx += 1;
            break;
        }
        idx += 1;
    }
    (header, idx)
}

fn collect_body(lines: &[String], mut idx: usize) -> (Vec<String>, String, usize) {
    let mut body = Vec::new();
    let mut closing = String::from("}");
    while idx < lines.len() {
        let current = lines[idx].clone();
        if current.trim_start().starts_with('}') {
            closing = current;
            idx += 1;
            break;
        } else {
            body.push(current);
            idx += 1;
        }
    }
    (body, closing, idx)
}

fn extract_theme_name(header_lines: &[String]) -> String {
    let header_joined = header_lines.join(" ");
    if header_joined.contains("@theme") {
        return "light".to_owned();
    }

    if let Some(index) = header_joined.find("data-theme=") {
        let after = &header_joined[index..];
        if let Some((delimiter, rest)) = after
            .chars()
            .skip_while(|ch| *ch != '\'' && *ch != '"')
            .next()
            .map(|delim| (delim, &after[after.find(delim).unwrap() + 1..]))
        {
            if let Some(end) = rest.find(delimiter) {
                return rest[..end].to_owned();
            }
        }
    }

    for line in header_lines {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix('.') {
            let mut name = String::new();
            for ch in rest.chars() {
                if ch.is_alphanumeric() || ch == '-' || ch == '_' {
                    name.push(ch);
                } else {
                    break;
                }
            }
            if !name.is_empty() {
                return name;
            }
        }
    }

    "unknown".to_owned()
}

fn parse_block_items(lines: Vec<String>) -> Result<Vec<BlockItem>> {
    let mut items = Vec::new();
    let mut idx = 0;

    while idx < lines.len() {
        let line = &lines[idx];
        let trimmed = line.trim_start();
        if trimmed.is_empty() || trimmed.starts_with("/*") {
            items.push(BlockItem::Raw(line.clone()));
            idx += 1;
            continue;
        }

        if trimmed.starts_with("--") {
            let mut var_lines = vec![line.clone()];
            idx += 1;
            if !trimmed.contains(';') {
                while idx < lines.len() {
                    let candidate = lines[idx].clone();
                    var_lines.push(candidate.clone());
                    idx += 1;
                    if candidate.contains(';') {
                        break;
                    }
                }
            }
            let variable = parse_variable_lines(var_lines)?;
            items.push(BlockItem::Variable(variable));
            continue;
        } else {
            items.push(BlockItem::Raw(line.clone()));
            idx += 1;
        }
    }

    Ok(items)
}

fn parse_variable_lines(lines: Vec<String>) -> Result<VariableLine> {
    ensure!(!lines.is_empty(), "Variable must have at least one line");
    let first_line = &lines[0];

    let leading: String = first_line
        .chars()
        .take_while(|c| c.is_whitespace())
        .collect();
    let trimmed = first_line.trim_start();
    ensure!(
        trimmed.starts_with("--"),
        "Variable line must start with --"
    );

    let (name_part, remainder) = trimmed
        .split_once(':')
        .ok_or_else(|| anyhow!("Variable definition must contain ':'"))?;

    let mut value_parts = Vec::new();
    value_parts.push(remainder.trim_start().to_owned());

    for extra in lines.iter().skip(1) {
        value_parts.push(extra.trim().to_owned());
    }

    let mut combined = value_parts.join(" ");
    if let Some(idx) = combined.rfind(';') {
        combined = combined[..idx].to_owned();
    }
    combined = combined.trim().to_owned();

    let trailing = if let Some(idx) = trimmed.find(';') {
        trimmed[idx + 1..].to_owned()
    } else {
        String::new()
    };

    Ok(VariableLine {
        leading,
        name: name_part.trim().to_owned(),
        value: combined,
        trailing,
        raw_lines: lines,
        dirty: false,
    })
}

fn compute_usage_counts(names: &[String]) -> Result<BTreeMap<String, usize>> {
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
            if let Some((_, count_str)) = line.rsplit_once(':') {
                if let Ok(count) = count_str.trim().parse::<usize>() {
                    total += count;
                }
            }
        }
        Ok(total)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(anyhow!("ripgrep failed for pattern '{pattern}': {stderr}"))
    }
}
