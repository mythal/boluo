UPDATE channel_members
SET text_color = COALESCE($3, text_color)
WHERE user_id = $1
  AND channel_id = $2
  AND is_joined
RETURNING channel_members;
