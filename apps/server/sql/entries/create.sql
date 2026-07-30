INSERT INTO entries (
    id,
    scope_id,
    display_name,
    reference_note_id,
    tags,
    sort
)
SELECT $1, scope.id, $3, $4, $5, $6
FROM scopes scope
WHERE scope.id = $2;
