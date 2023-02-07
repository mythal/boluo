UPDATE channel_members
SET character_name = COALESCE($3, character_name)
WHERE user_id = $1
  AND channel_id = $2
  AND is_joined
RETURNING channel_members;
