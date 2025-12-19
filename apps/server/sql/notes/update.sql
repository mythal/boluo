UPDATE notes
SET type = COALESCE(($2::text)::note_type, type),
    title = COALESCE($3, title),
    keywords = COALESCE($4, keywords),
    content = COALESCE($5, content),
    visibility = COALESCE(($6::text)::note_visibility, visibility),
    visible_to = COALESCE($7, visible_to),
    everyone_can_edit = COALESCE($8, everyone_can_edit),
    track_history = COALESCE($9, track_history),
    modified = (now() at time zone 'utc')
WHERE id = $1
RETURNING notes as "note!: Note";
