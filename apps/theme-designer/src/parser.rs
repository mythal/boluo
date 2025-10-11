use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result, anyhow, ensure};
use once_cell::sync::Lazy;

static EMPTY_THEME_VALUES: Lazy<BTreeMap<String, String>> = Lazy::new(BTreeMap::new);

pub struct ThemeFile {
    pub path: PathBuf,
    chunks: Vec<FileChunk>,
}

impl ThemeFile {
    pub fn empty(path: PathBuf) -> Self {
        Self {
            path,
            chunks: Vec::new(),
        }
    }

    pub fn load(path: &Path) -> Result<Self> {
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

    pub fn collect_rows(&self) -> (Vec<String>, Vec<VariableRow>) {
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

    pub fn apply(
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

    pub fn write(&self) -> Result<()> {
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
            BlockItem::Variable(var) => theme_values.contains_key(&var.name),
            _ => true,
        });

        for item in &mut self.items {
            if let BlockItem::Variable(var) = item
                && let Some(new_value) = theme_values.get(&var.name)
            {
                var.set_value(new_value);
                seen.insert(var.name.clone());
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

#[derive(Clone)]
pub struct VariableRow {
    pub name: String,
    pub values: BTreeMap<String, String>,
    pub usage_count: Option<usize>,
}

pub fn default_theme_file_path() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../packages/tailwind-config/theme.tailwind.css")
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
        for line in lines.iter().take((idx + 3).min(lines.len())).skip(idx) {
            if line.contains("data-theme=") {
                return true;
            }
            if line.contains('{') {
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
            .find(|ch| *ch == '\'' || *ch == '"')
            .map(|delim| (delim, &after[after.find(delim).unwrap() + 1..]))
            && let Some(end) = rest.find(delimiter)
        {
            return rest[..end].to_owned();
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
