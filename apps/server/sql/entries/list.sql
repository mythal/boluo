SELECT
    entry.id,
    entry.scope_id,
    primary_identifier.value::text AS "key!: CompactString",
    ARRAY(
        SELECT identifier.value::text
        FROM entry_identifiers identifier
        WHERE identifier.entry_id = entry.id
          AND identifier.kind = 'Alias'
        ORDER BY identifier.value
    ) AS "aliases!: Vec<CompactString>",
    entry.display_name AS "display_name!: CompactString",
    entry.reference_note_id,
    entry.tags AS "tags!: Vec<CompactString>",
    entry.pos_p,
    entry.pos_q,
    entry.pos AS "pos!",
    entry.metadata_version AS "metadata_version!",
    entry.created,
    entry.modified
FROM entries entry
JOIN entry_identifiers primary_identifier
  ON primary_identifier.entry_id = entry.id
 AND primary_identifier.kind = 'Primary'
WHERE entry.scope_id = $1
ORDER BY entry.pos, entry.id;
