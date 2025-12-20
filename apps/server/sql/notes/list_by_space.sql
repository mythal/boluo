SELECT notes as "note!: Note"
FROM notes
WHERE space_id = $1
ORDER BY modified DESC;
