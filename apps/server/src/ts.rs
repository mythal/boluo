use specta::*;
use specta_typescript::Typescript;

#[derive(Type)]
pub struct MyCustomType {
    pub my_field: String,
}

pub fn export() {
    Typescript::default()
        .bigint(specta_typescript::BigIntExportBehavior::Number)
        .export_to("./packages/api/src/bindings.ts", &specta::export())
        .unwrap();
}
