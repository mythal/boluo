SELECT
    asset.id,
    asset.space_id,
    asset.media_id,
    asset.creator_id,
    asset.name,
    asset.policy AS "policy!: AssetPolicy",
    media.mime_type,
    asset.created
FROM assets asset
JOIN media ON media.id = asset.media_id
WHERE asset.creator_id = $1
ORDER BY asset.created DESC, asset.id DESC;
