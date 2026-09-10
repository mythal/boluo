DROP INDEX entry_component_history_key_effect_index;
CREATE INDEX entry_component_history_key_effect_index
    ON entry_component_history (lower(key), entry_effect_id, entry_id, component_type);
