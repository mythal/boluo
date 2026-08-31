SELECT EXISTS(
    SELECT 1
    FROM character_identifiers
    WHERE space_id = $1
      AND value = ANY($2::citext[])
      AND ($3::uuid IS NULL OR character_id <> $3)
) AS "exists!";
