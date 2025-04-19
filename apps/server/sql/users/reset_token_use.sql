UPDATE reset_tokens
SET
    used_at = now() at time zone 'utc'
WHERE
    token = $1
    AND user_id = $2
    AND used_at IS NULL
    AND invalidated_at IS NULL;
