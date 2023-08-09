SELECT c, cm
FROM channels c
  LEFT JOIN channel_members cm ON cm.channel_id = c.id AND cm.user_id = $2
  LEFT JOIN space_members sm ON sm.user_id = cm.user_id AND sm.space_id = c.space_id
WHERE
  c.space_id = $1 AND
  c.deleted = false AND
  (c.is_public OR cm.is_joined OR sm.is_admin)
ORDER BY c.created;
