SELECT EXISTS(
    SELECT 1
    FROM scopes scope
    JOIN notes note ON note.space_id = scope.space_id
    WHERE scope.id = $1
      AND note.id = $2
) AS "reference_valid!";
