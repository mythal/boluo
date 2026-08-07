SELECT
    note.id,
    note.space_id,
    note.title AS "title!: CompactString",
    note.keywords AS "keywords!: Vec<CompactString>",
    note.tags AS "tags!: Vec<CompactString>",
    note.creator_id,
    note.access_policy AS "access_policy!: AccessPolicy",
    note.access_channel_id,
    note.revision,
    note.archived_at,
    note.created,
    note.modified
FROM notes note
WHERE note.space_id = $1
  AND ($2 OR note.archived_at IS NULL)
ORDER BY note.modified DESC, note.id DESC;
