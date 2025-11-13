mod parser;
mod stats;

use std::collections::BTreeMap;

use anyhow::Result;
use eframe::egui::{self, Color32};
use egui_extras::{Column, TableBuilder};

use parser::{ThemeFile, VariableRow, default_theme_file_path};
use stats::compute_usage_counts;

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
    was_focused: bool,
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
                    was_focused: false,
                };
                designer.ensure_new_var_placeholders();
                designer
            }
        }
    }

    fn load_from_disk() -> Result<Self> {
        let path = default_theme_file_path();
        let theme_file = ThemeFile::load(&path)?;
        let (theme_names, mut variable_rows) = theme_file.collect_rows();

        // Sort variables alphabetically by name
        variable_rows.sort_by(|a, b| a.name.cmp(&b.name));

        let mut designer = ThemeDesigner {
            theme_file,
            theme_names,
            variable_rows,
            new_var_name: String::new(),
            new_var_values: BTreeMap::new(),
            dirty: false,
            status_message: None,
            error_message: None,
            was_focused: false,
        };

        designer.ensure_new_var_placeholders();
        Ok(designer)
    }

    fn ensure_new_var_placeholders(&mut self) {
        for theme in &self.theme_names {
            self.new_var_values.entry(theme.clone()).or_default();
        }
    }

    fn reload_from_disk(&mut self) -> Result<()> {
        let path = self.theme_file.path.clone();
        let theme_file = ThemeFile::load(&path)?;
        let (theme_names, mut variable_rows) = theme_file.collect_rows();

        // Sort variables alphabetically by name
        variable_rows.sort_by(|a, b| a.name.cmp(&b.name));

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

        // Sort to maintain alphabetical order
        self.variable_rows.sort_by(|a, b| a.name.cmp(&b.name));

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
        // Handle keyboard shortcuts
        if ctx.input(|i| i.modifiers.command && i.key_pressed(egui::Key::S)) {
            self.save();
        }

        // Auto-reload when window gains focus
        let is_focused = ctx.input(|i| i.viewport().focused.unwrap_or(false));
        if is_focused && !self.was_focused {
            // Window just gained focus - reload from disk
            match self.reload_from_disk() {
                Ok(()) => {
                    // Silent reload - don't show status message for auto-reload
                }
                Err(err) => {
                    self.error_message = Some(format!("Auto-reload failed: {err}"));
                }
            }
        }
        self.was_focused = is_focused;

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
                let mut builder = TableBuilder::new(ui)
                    .striped(true)
                    .column(Column::exact(64.0))
                    .column(Column::initial(240.0).at_least(120.0).resizable(true));

                for _ in &self.theme_names {
                    builder = builder.column(
                        Column::remainder()
                            .at_least(80.0)
                            .clip(false)
                            .resizable(true),
                    );
                }

                let table = builder.header(24.0, |mut header| {
                    header.col(|ui| {
                        ui.strong("Usage");
                    });
                    header.col(|ui| {
                        ui.strong("Variable");
                    });
                    for theme in &self.theme_names {
                        header.col(|ui| {
                            ui.strong(theme);
                        });
                    }
                });

                table.body(|body| {
                    let row_height = 30.0;
                    let row_count = self.variable_rows.len();
                    body.rows(row_height, row_count, |mut row| {
                        let idx = row.index();
                        if idx >= self.variable_rows.len() {
                            return;
                        }

                        let variable = &mut self.variable_rows[idx];
                        let usage_text = variable
                            .usage_count
                            .map(|count| count.to_string())
                            .unwrap_or_else(|| "-".to_owned());

                        row.col(|ui| {
                            ui.label(usage_text);
                        });

                        row.col(|ui| {
                            ui.label(&variable.name);
                        });

                        for theme in &self.theme_names {
                            row.col(|ui| {
                                let value = variable.values.entry(theme.clone()).or_default();
                                let width = ui.available_width().max(60.0);
                                ui.set_width(width);
                                let response =
                                    ui.add(egui::TextEdit::singleline(value).desired_width(width));
                                if response.changed() {
                                    self.dirty = true;
                                }

                                if value.trim().is_empty() {
                                    value.clear();
                                }
                            });
                        }
                    });
                });
            });

            ui.separator();

            ui.heading("Add variable");
            ui.horizontal(|ui| {
                ui.label("Name");
                let width = ui.available_width().max(120.0);
                ui.set_width(width);
                ui.add(egui::TextEdit::singleline(&mut self.new_var_name).desired_width(width));
            });

            for theme in &self.theme_names {
                let entry = self.new_var_values.entry(theme.clone()).or_default();
                ui.horizontal(|ui| {
                    ui.label(format!("{theme} value"));
                    let width = ui.available_width().max(80.0);
                    ui.set_width(width);
                    ui.add(egui::TextEdit::singleline(entry).desired_width(width));
                });
            }

            if ui.button("Add").clicked() {
                self.add_variable();
            }
        });
    }
}
