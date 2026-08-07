INSERT INTO note_content_revisions (
    note_id,
    revision,
    operator_id,
    title,
    text,
    entities
)
VALUES ($1, $2, $3, $4, $5, $6);
