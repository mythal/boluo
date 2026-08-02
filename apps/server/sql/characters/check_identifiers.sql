SELECT EXISTS(
    SELECT 1
    FROM character_identifiers
    WHERE space_id = $1
      AND value = ANY($2::citext[])
) AS "exists!";
