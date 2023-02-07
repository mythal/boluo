UPDATE channel_members
SET is_joined = false
WHERE user_id = $1
  AND channel_id = $2;
