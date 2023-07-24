INSERT INTO media (id, mime_type, uploader_id, filename, original_filename, hash, size, source)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING media;
