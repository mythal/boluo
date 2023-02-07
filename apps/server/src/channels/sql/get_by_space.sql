SELECT channel
FROM channels channel
WHERE channel.space_id = $1
  AND deleted = false
ORDER BY channel.created;
