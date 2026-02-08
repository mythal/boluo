SELECT DISTINCT
    user_id
FROM
    channel_members
WHERE
    channel_id = $1
    AND is_joined;
