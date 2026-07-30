SELECT
    note_id,
    revision,
    operator_id,
    title AS "title!: CompactString",
    text,
    entities AS "entities!: Entities",
    created
FROM note_content_revisions
WHERE note_id = $1
ORDER BY revision DESC;
