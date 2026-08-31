SELECT media.mime_type
FROM assets asset
JOIN media ON media.id = asset.media_id
WHERE asset.id = $1;
