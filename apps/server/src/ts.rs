use specta_typescript::Typescript;

pub fn export() {
    Typescript::default()
        .bigint(specta_typescript::BigIntExportBehavior::Number)
        .export_to("./packages/api/src/bindings.ts", &specta::export())
        .unwrap();
}
