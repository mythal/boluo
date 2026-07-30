SELECT
    operation_id,
    operator_id,
    scope_id,
    entry_id,
    source_message_id,
    key,
    previous_key,
    action AS "action!: EntryHistoryAction",
    created
FROM entry_history
WHERE scope_id = $1
  AND ($2::uuid IS NULL OR entry_id = $2)
ORDER BY created DESC, operation_id DESC, entry_id;
