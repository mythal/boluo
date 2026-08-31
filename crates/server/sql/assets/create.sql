WITH inserted AS (
    INSERT INTO assets (id, space_id, media_id, creator_id, name, policy)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, space_id, media_id, creator_id, name, policy, created
)
SELECT
    inserted.id,
    inserted.space_id,
    inserted.media_id,
    inserted.creator_id,
    inserted.name,
    inserted.policy AS "policy!: AssetPolicy",
    media.mime_type,
    inserted.created
FROM inserted
JOIN media ON media.id = inserted.media_id;
