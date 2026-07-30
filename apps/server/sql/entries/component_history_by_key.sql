SELECT
    operation_id,
    operator_id,
    scope_id,
    entry_id,
    source_message_id,
    key,
    component_type,
    action AS "action!: EntryComponentHistoryAction",
    data,
    schema_version,
    created
FROM entry_component_history
WHERE scope_id = $1
  AND key = $2
ORDER BY created DESC, operation_id DESC, entry_id, component_type;
