SELECT EXISTS(
    SELECT 1
    FROM character_variables
    WHERE character_id = $1
      AND (
        ($2::citext IS NOT NULL AND key = $2::citext)
        OR ($3::text[] IS NOT NULL AND alias && $3::text[])
      )
) as "exists!";
