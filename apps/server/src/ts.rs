use specta::{
    ResolvedTypes, Types,
    datatype::{DataType, Field, Fields},
};
use specta_typescript::{Typescript, define};

const JSON_VALUE_HEADER: &str = "export type JsonValue = null | boolean | number | string | JsonValue[] | { [key in string]: JsonValue };\n";
const SKIP_SERIALIZING_IF: &str = "serde:field:skip_serializing_if";

pub fn export() {
    Typescript::default()
        .header(JSON_VALUE_HEADER)
        .export_to(
            "./packages/types/bindings.ts",
            &typescript_resolved_types(specta::collect()),
        )
        .unwrap();
}

fn typescript_resolved_types(types: Types) -> ResolvedTypes {
    let mut resolved_types = specta_serde::apply(types.map(|mut named_type| {
        normalize_pre_serde(named_type.ty_mut());
        named_type
    }))
    .unwrap();
    resolved_types.iter_mut(|named_type| {
        normalize_post_serde(named_type.ty_mut());
    });
    resolved_types
}

fn normalize_pre_serde(data_type: &mut DataType) {
    walk_datatype(data_type, &mut normalize_skip_serializing_if_field);
}

fn normalize_skip_serializing_if_field(field: &mut Field) {
    if field
        .attributes()
        .get_named_as::<String>(SKIP_SERIALIZING_IF)
        .is_some()
    {
        // Unified serde export cannot model conditional omission directly.
        // Preserve the old bindings behavior by making such fields optional.
        field.set_optional(true);
        field.attributes_mut().insert(SKIP_SERIALIZING_IF, true);
    }
}

fn normalize_post_serde(data_type: &mut DataType) {
    if is_serde_json_value(data_type) {
        *data_type = DataType::Reference(define("JsonValue"));
        return;
    }

    match data_type {
        | DataType::List(list) => normalize_post_serde(list.ty_mut()),
        | DataType::Map(map) => {
            normalize_post_serde(map.key_ty_mut());
            normalize_post_serde(map.value_ty_mut());
        }
        | DataType::Struct(struct_type) => normalize_post_serde_fields(struct_type.fields_mut()),
        | DataType::Enum(enum_type) => {
            for (_, variant) in enum_type.variants_mut() {
                normalize_post_serde_fields(variant.fields_mut());
            }
        }
        | DataType::Tuple(tuple) => {
            for element in tuple.elements_mut() {
                normalize_post_serde(element);
            }
        }
        | DataType::Nullable(inner) => normalize_post_serde(inner),
        | DataType::Reference(specta::datatype::Reference::Named(reference)) => {
            for (_, generic_type) in reference.generics_mut() {
                normalize_post_serde(generic_type);
            }
        }
        | DataType::Primitive(_) | DataType::Reference(_) => {}
    }
}

fn is_serde_json_value(data_type: &DataType) -> bool {
    let DataType::Enum(enum_type) = data_type else {
        return false;
    };
    let variants = enum_type.variants();
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
            for field in fields.fields_mut() {
                if let Some(field_type) = field.ty_mut() {
                    normalize_post_serde(field_type);
                }
            }
        }
        | Fields::Named(fields) => {
            for (_, field) in fields.fields_mut() {
                if let Some(field_type) = field.ty_mut() {
                    normalize_post_serde(field_type);
                }
            }
        }
    }
}

fn walk_datatype(data_type: &mut DataType, on_field: &mut dyn FnMut(&mut Field)) {
    match data_type {
        | DataType::List(list) => walk_datatype(list.ty_mut(), on_field),
        | DataType::Map(map) => {
            walk_datatype(map.key_ty_mut(), on_field);
            walk_datatype(map.value_ty_mut(), on_field);
        }
        | DataType::Struct(struct_type) => walk_fields(struct_type.fields_mut(), on_field),
        | DataType::Enum(enum_type) => {
            for (_, variant) in enum_type.variants_mut() {
                walk_fields(variant.fields_mut(), on_field);
            }
        }
        | DataType::Tuple(tuple) => {
            for element in tuple.elements_mut() {
                walk_datatype(element, on_field);
            }
        }
        | DataType::Nullable(inner) => walk_datatype(inner, on_field),
        | DataType::Reference(specta::datatype::Reference::Named(reference)) => {
            for (_, generic_type) in reference.generics_mut() {
                walk_datatype(generic_type, on_field);
            }
        }
        | DataType::Primitive(_) | DataType::Reference(_) => {}
    }
}

fn walk_fields(fields: &mut Fields, on_field: &mut dyn FnMut(&mut Field)) {
    match fields {
        | Fields::Unit => {}
        | Fields::Unnamed(fields) => {
            for field in fields.fields_mut() {
                on_field(field);
                if let Some(field_type) = field.ty_mut() {
                    walk_datatype(field_type, on_field);
                }
            }
        }
        | Fields::Named(fields) => {
            for (_, field) in fields.fields_mut() {
                on_field(field);
                if let Some(field_type) = field.ty_mut() {
                    walk_datatype(field_type, on_field);
                }
            }
        }
    }
}
