use std::borrow::Cow;

use specta::{
    Format, FormatError, Types,
    datatype::{DataType, Field, Fields, NamedReferenceType, Reference},
};
use specta_typescript::{Typescript, define, semantic::Configuration};

const JSON_VALUE_HEADER: &str = "export type JsonValue = null | boolean | number | string | JsonValue[] | { [key in string]: JsonValue };\n";
const SKIP_SERIALIZING_IF: &str = "serde:field:skip_serializing_if";

pub fn export() {
    Typescript::default()
        .header(JSON_VALUE_HEADER)
        .export_to(
            "./packages/types/bindings.ts",
            &specta::collect(),
            TypescriptFormat,
        )
        .unwrap();
}

struct TypescriptFormat;

impl Format for TypescriptFormat {
    fn map_types(&'_ self, types: &Types) -> Result<Cow<'_, Types>, FormatError> {
        let types = types.clone().map(|mut named_type| {
            if let Some(data_type) = named_type.ty.as_mut() {
                normalize_pre_serde(data_type);
            }
            named_type
        });
        let types = specta_serde::Format.map_types(&types)?.into_owned();
        let mut types = typescript_semantic_config()
            .apply_types(&types)
            .into_owned();
        types.iter_mut(|named_type| {
            if let Some(data_type) = named_type.ty.as_mut() {
                normalize_post_serde(data_type);
            }
        });
        Ok(Cow::Owned(types))
    }

    fn map_type(
        &'_ self,
        types: &Types,
        data_type: &DataType,
    ) -> Result<Cow<'_, DataType>, FormatError> {
        let types = types.clone().map(|mut named_type| {
            if let Some(data_type) = named_type.ty.as_mut() {
                normalize_pre_serde(data_type);
            }
            named_type
        });
        let mut data_type = data_type.clone();
        normalize_pre_serde(&mut data_type);

        let mut data_type = specta_serde::Format
            .map_type(&types, &data_type)?
            .into_owned();
        if let Some((Some(remapped), _)) =
            typescript_semantic_config().apply_deserialize(&types, &data_type, "value")
        {
            data_type = remapped;
        }
        normalize_post_serde(&mut data_type);
        Ok(Cow::Owned(data_type))
    }
}

fn typescript_semantic_config() -> Configuration {
    Configuration::empty().enable_lossless_floats()
}

fn normalize_pre_serde(data_type: &mut DataType) {
    walk_datatype(data_type, &mut normalize_skip_serializing_if_field);
}

fn normalize_skip_serializing_if_field(field: &mut Field) {
    if field
        .attributes
        .get_named_as::<String>(SKIP_SERIALIZING_IF)
        .is_some()
    {
        // Unified serde export cannot model conditional omission directly.
        // Preserve the old bindings behavior by making such fields optional.
        field.optional = true;
        field.attributes.insert(SKIP_SERIALIZING_IF, true);
    }
}

fn normalize_post_serde(data_type: &mut DataType) {
    if is_serde_json_value(data_type) {
        *data_type = DataType::Reference(define("JsonValue"));
        return;
    }

    match data_type {
        | DataType::List(list) => normalize_post_serde(&mut list.ty),
        | DataType::Map(map) => {
            normalize_post_serde(map.key_ty_mut());
            normalize_post_serde(map.value_ty_mut());
        }
        | DataType::Struct(struct_type) => normalize_post_serde_fields(&mut struct_type.fields),
        | DataType::Enum(enum_type) => {
            for (_, variant) in &mut enum_type.variants {
                normalize_post_serde_fields(&mut variant.fields);
            }
        }
        | DataType::Tuple(tuple) => {
            for element in &mut tuple.elements {
                normalize_post_serde(element);
            }
        }
        | DataType::Intersection(types) => {
            for data_type in types {
                normalize_post_serde(data_type);
            }
        }
        | DataType::Nullable(inner) => normalize_post_serde(inner),
        | DataType::Reference(Reference::Named(reference)) => match &mut reference.inner {
            | NamedReferenceType::Reference { generics, .. } => {
                for (_, generic_type) in generics {
                    normalize_post_serde(generic_type);
                }
            }
            | NamedReferenceType::Inline { dt, .. } => normalize_post_serde(dt),
            | NamedReferenceType::Recursive(_) => {}
        },
        | DataType::Generic(_) | DataType::Primitive(_) | DataType::Reference(_) => {}
    }
}

fn is_serde_json_value(data_type: &DataType) -> bool {
    let DataType::Enum(enum_type) = data_type else {
        return false;
    };
    let variants = &enum_type.variants;
    variants.len() == 6
        && ["Null", "Bool", "Number", "String", "Array", "Object"]
            .into_iter()
            .all(|name| {
                variants
                    .iter()
                    .any(|(variant_name, _)| variant_name == name)
            })
}

fn normalize_post_serde_fields(fields: &mut Fields) {
    match fields {
        | Fields::Unit => {}
        | Fields::Unnamed(fields) => {
            for field in &mut fields.fields {
                if let Some(field_type) = field.ty.as_mut() {
                    normalize_post_serde(field_type);
                }
            }
        }
        | Fields::Named(fields) => {
            for (_, field) in &mut fields.fields {
                if let Some(field_type) = field.ty.as_mut() {
                    normalize_post_serde(field_type);
                }
            }
        }
    }
}

fn walk_datatype(data_type: &mut DataType, on_field: &mut dyn FnMut(&mut Field)) {
    match data_type {
        | DataType::List(list) => walk_datatype(&mut list.ty, on_field),
        | DataType::Map(map) => {
            walk_datatype(map.key_ty_mut(), on_field);
            walk_datatype(map.value_ty_mut(), on_field);
        }
        | DataType::Struct(struct_type) => walk_fields(&mut struct_type.fields, on_field),
        | DataType::Enum(enum_type) => {
            for (_, variant) in &mut enum_type.variants {
                walk_fields(&mut variant.fields, on_field);
            }
        }
        | DataType::Tuple(tuple) => {
            for element in &mut tuple.elements {
                walk_datatype(element, on_field);
            }
        }
        | DataType::Intersection(types) => {
            for data_type in types {
                walk_datatype(data_type, on_field);
            }
        }
        | DataType::Nullable(inner) => walk_datatype(inner, on_field),
        | DataType::Reference(Reference::Named(reference)) => match &mut reference.inner {
            | NamedReferenceType::Reference { generics, .. } => {
                for (_, generic_type) in generics {
                    walk_datatype(generic_type, on_field);
                }
            }
            | NamedReferenceType::Inline { dt, .. } => walk_datatype(dt, on_field),
            | NamedReferenceType::Recursive(_) => {}
        },
        | DataType::Generic(_) | DataType::Primitive(_) | DataType::Reference(_) => {}
    }
}

fn walk_fields(fields: &mut Fields, on_field: &mut dyn FnMut(&mut Field)) {
    match fields {
        | Fields::Unit => {}
        | Fields::Unnamed(fields) => {
            for field in &mut fields.fields {
                on_field(field);
                if let Some(field_type) = field.ty.as_mut() {
                    walk_datatype(field_type, on_field);
                }
            }
        }
        | Fields::Named(fields) => {
            for (_, field) in &mut fields.fields {
                on_field(field);
                if let Some(field_type) = field.ty.as_mut() {
                    walk_datatype(field_type, on_field);
                }
            }
        }
    }
}
