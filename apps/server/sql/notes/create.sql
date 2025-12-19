INSERT INTO notes (
    type,
    space_id,
    title,
    keywords,
    owner_id,
    content,
    visibility,
    visible_to,
    everyone_can_edit,
    track_history
)
VALUES (($1::text)::note_type, $2, $3, $4, $5, $6, ($7::text)::note_visibility, $8, $9, $10)
RETURNING notes as "note!: Note";
