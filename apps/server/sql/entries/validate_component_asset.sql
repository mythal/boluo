SELECT EXISTS (
    SELECT 1
    FROM entries entry
    JOIN scopes scope ON scope.id = entry.scope_id
    JOIN assets asset ON asset.id = $2 AND asset.space_id = scope.space_id
    WHERE entry.id = $1
) AS "valid!";
