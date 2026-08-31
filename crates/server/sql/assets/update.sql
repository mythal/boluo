WITH updated AS (
    UPDATE assets
    SET name = $2, policy = $3
    WHERE id = $1
    RETURNING id, space_id, media_id, creator_id, name, policy, created
)
SELECT
    updated.id,
    updated.space_id,
    updated.media_id,
    updated.creator_id,
    updated.name,
    updated.policy AS "policy!: AssetPolicy",
    media.mime_type,
    updated.created
FROM updated
JOIN media ON media.id = updated.media_id;
