UPDATE reset_tokens
SET
    invalidated_at = now()
WHERE
    user_id = $1
    AND used_at IS NULL
    AND invalidated_at IS NULL;
