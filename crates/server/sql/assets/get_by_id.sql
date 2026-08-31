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
WHERE asset.space_id = $1
  AND asset.id = $2;
