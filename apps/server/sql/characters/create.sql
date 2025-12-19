INSERT INTO characters (
    name,
    description,
    color,
    alias,
    image_id,
    space_id,
    owner_id,
    visibility,
    is_archived,
    metadata
)
VALUES ($1, $2, $3, $4, $5, $6, $7, ($8::text)::character_visibility, $9, $10)
RETURNING characters as "character!: Character";
