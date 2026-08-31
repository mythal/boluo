INSERT INTO character_scopes (
    space_id,
    character_id,
    scope_id,
    purpose
)
SELECT
    character.space_id,
    character.id,
    scope.id,
    $3
FROM characters character
JOIN scopes scope ON scope.space_id = character.space_id
WHERE character.id = $1
  AND scope.id = $2
  AND scope.kind = 'Character'
  AND NOT EXISTS (
      SELECT 1
      FROM characters scope_owner
      WHERE scope_owner.main_scope_id = scope.id
  )
  AND $3 <> 'main';
