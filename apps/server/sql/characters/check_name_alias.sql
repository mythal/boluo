SELECT EXISTS(
    SELECT 1
    FROM characters
    WHERE space_id = $1
      AND (
        ($2::text IS NOT NULL AND name = $2::text)
        OR ($3::text IS NOT NULL AND alias = $3::text)
      )
) as "exists!";
