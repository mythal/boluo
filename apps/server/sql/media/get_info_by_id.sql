SELECT
    id,
    mime_type,
    original_filename,
    size
FROM media
WHERE id = $1
LIMIT 1;
