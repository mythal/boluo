UPDATE spaces SET latest_activity = $2
FROM channels
WHERE spaces.id = channels.space_id AND channels.id = $1;
