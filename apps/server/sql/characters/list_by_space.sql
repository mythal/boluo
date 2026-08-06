SELECT
    character.id,
    character.name AS "name!: CompactString",
    primary_identifier.value::text AS "key!: CompactString",
    ARRAY(
        SELECT identifier.value::text
        FROM character_identifiers identifier
        WHERE identifier.character_id = character.id
          AND identifier.kind = 'Alias'
        ORDER BY identifier.value
    ) AS "aliases!: Vec<CompactString>",
    character.description,
    character.color AS "color!: CompactString",
    character.space_id,
    character.main_scope_id AS scope_id,
    scope.owner_id,
    scope.access_policy AS "access_policy!: AccessPolicy",
    scope.access_channel_id,
    scope.version AS scope_version,
    character.archived_at,
    character.tags AS "tags!: Vec<CompactString>",
    character.created,
    character.modified,
    character.version
FROM characters character
JOIN scopes scope ON scope.id = character.main_scope_id
JOIN character_identifiers primary_identifier
  ON primary_identifier.character_id = character.id
 AND primary_identifier.kind = 'Primary'
WHERE character.space_id = $1
ORDER BY character.modified DESC;
