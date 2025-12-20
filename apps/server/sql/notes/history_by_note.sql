SELECT notes_history as "history!: NoteHistory"
FROM notes_history
WHERE note_id = $1
ORDER BY created DESC;
