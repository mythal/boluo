SELECT EXISTS(
    SELECT 1
    FROM entry_identifiers
    WHERE scope_id = $1
      AND value = ANY($2::citext[])
) AS "exists!";
