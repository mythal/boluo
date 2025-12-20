UPDATE characters
SET name = COALESCE($2, name),
    description = COALESCE($3, description),
    color = COALESCE($4, color),
    alias = CASE
        WHEN $5::text IS NULL THEN alias
        ELSE NULLIF($5::text, '')
    END,
    image_id = COALESCE($6, image_id),
    visibility = COALESCE(($7::text)::character_visibility, visibility),
    is_archived = COALESCE($8, is_archived),
    metadata = COALESCE($9, metadata),
    modified = (now() at time zone 'utc')
WHERE id = $1
RETURNING characters as "character!: Character";
