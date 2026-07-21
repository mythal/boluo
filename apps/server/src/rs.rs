use std::borrow::Cow;

use specta::{
    Format, FormatError, Types,
    datatype::{DataType, Field, Fields, NamedReferenceType, Reference},
};
use specta_rust::Rust;

#[derive(Hash, PartialEq, Eq)]
struct Opaque(String);

pub fn export() {
    let mut types = Types::default();
    types.register_mut::<shared_types::messages::NewMessage>();
    types.register_mut::<crate::events::Update>();
    types.register_mut::<crate::channels::Channel>();
    types.register_mut::<crate::channels::api::ChannelWithMaybeMember>();
    types.register_mut::<crate::users::LoginReturn>();
    types.register_mut::<shared_types::events::Token>();

    let source = Rust::default()
        .derive("serde::Serialize")
        .derive("serde::Deserialize")
        // Specta maps these to a string for other languages; keep the Rust identity.
        .inline_as("uuid::Uuid", "::uuid::Uuid")
        .inline_as("chrono::DateTime", "::chrono::DateTime<::chrono::Utc>")
        .opaque_type(|reference| {
            reference
                .downcast_ref::<Opaque>()
                .map(|opaque| Cow::Owned(opaque.0.clone()))
        })
        .export(&types, RustFormat)
        .unwrap();
    std::fs::write("./packages/generated/src/generated.rs", source).unwrap();
}

struct RustFormat;

// The Rust exporter reconstructs `#[serde(...)]` attributes from the graph's serde
// metadata, so unlike the TypeScript pipeline it must NOT run `specta_serde::Format`
// (which strips those attributes and pre-renames field names). This format only
// swaps hand-written types for opaque `crate::` references.
impl Format for RustFormat {
    fn map_types(&self, types: &Types) -> Result<Cow<'_, Types>, FormatError> {
        let mapped = types.clone().map(|mut named_type| {
            if is_opaque_definition(&named_type) {
                named_type.ty = None;
            } else if let Some(data_type) = named_type.ty.as_mut() {
                replace_opaque(types, data_type);
            }
            named_type
        });
        Ok(Cow::Owned(mapped))
    }

    fn map_type(
        &self,
        types: &Types,
        data_type: &DataType,
    ) -> Result<Cow<'_, DataType>, FormatError> {
        let mut mapped = data_type.clone();
        replace_opaque(types, &mut mapped);
        Ok(Cow::Owned(mapped))
    }
}

fn replace_opaque(types: &Types, data_type: &mut DataType) {
    match data_type {
        DataType::List(list) => replace_opaque(types, &mut list.ty),
        DataType::Map(map) => {
            replace_opaque(types, map.key_ty_mut());
            replace_opaque(types, map.value_ty_mut());
        }
        DataType::Nullable(inner) => replace_opaque(types, inner),
        DataType::Tuple(tuple) => {
            for element in &mut tuple.elements {
                replace_opaque(types, element);
            }
        }
        DataType::Struct(strct) => replace_opaque_fields(types, &mut strct.fields),
        DataType::Enum(enm) => {
            for (_, variant) in &mut enm.variants {
                replace_opaque_fields(types, &mut variant.fields);
            }
        }
        DataType::Intersection(elements) => {
            for element in elements {
                replace_opaque(types, element);
            }
        }
        DataType::Reference(Reference::Named(reference)) => {
            if let Some(target) = types.get(reference).and_then(opaque_target) {
                *data_type = DataType::Reference(Reference::opaque(Opaque(target)));
                return;
            }
            match &mut reference.inner {
                NamedReferenceType::Reference { generics, .. } => {
                    for (_, generic) in generics {
                        replace_opaque(types, generic);
                    }
                }
                NamedReferenceType::Inline { dt, .. } => replace_opaque(types, dt),
                NamedReferenceType::Recursive(_) => {}
            }
        }
        DataType::Generic(_)
        | DataType::Primitive(_)
        | DataType::Reference(Reference::Opaque(_)) => {}
    }
}

/// Types with hostile serde wire attributes (`flatten`, `rename = "_"`, etc.) that
/// specta-rust cannot round-trip are hand-written in `shared_types` and referenced
/// from the generated file by path instead of being regenerated.
fn opaque_target(named_type: &specta::datatype::NamedDataType) -> Option<String> {
    let name = &named_type.name;
    if named_type.module_path.contains("shared_types::entities") {
        Some(format!("shared_types::entities::{name}"))
    } else if named_type.module_path.contains("shared_types::preview") {
        Some(format!("shared_types::preview::{name}"))
    } else if name == "Entities" {
        Some("shared_types::messages::Entities".to_string())
    } else if name == "Value" {
        Some("::serde_json::Value".to_string())
    } else {
        None
    }
}

fn is_opaque_definition(named_type: &specta::datatype::NamedDataType) -> bool {
    opaque_target(named_type).is_some()
}

fn replace_opaque_fields(types: &Types, fields: &mut Fields) {
    let iter: Box<dyn Iterator<Item = &mut Field>> = match fields {
        Fields::Unit => return,
        Fields::Unnamed(f) => Box::new(f.fields.iter_mut()),
        Fields::Named(f) => Box::new(f.fields.iter_mut().map(|(_, field)| field)),
    };
    for field in iter {
        if let Some(ty) = field.ty.as_mut() {
            replace_opaque(types, ty);
        }
    }
}
