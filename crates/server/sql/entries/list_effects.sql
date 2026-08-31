SELECT
    id,
    space_id,
    scope_id,
    operator_id,
    created,
    message_id
FROM entry_effects
WHERE space_id = $1
  AND id = ANY($2)
ORDER BY created DESC, id DESC;
