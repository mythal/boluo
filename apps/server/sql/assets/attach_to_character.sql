INSERT INTO character_assets (space_id, character_id, asset_id, sort)
SELECT
    $1,
    $2,
    requested.asset_id,
    requested.ordinality::integer - 1
FROM unnest($3::uuid[]) WITH ORDINALITY AS requested(asset_id, ordinality)
JOIN assets asset
  ON asset.space_id = $1
 AND asset.id = requested.asset_id
ORDER BY requested.ordinality;
