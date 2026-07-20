UPDATE reset_tokens
SET
    used_at = now()
WHERE
    token = $1
    AND user_id = $2
    AND used_at IS NULL
    AND invalidated_at IS NULL
    AND created > now() - ($3::bigint * interval '1 second')
RETURNING user_id;
