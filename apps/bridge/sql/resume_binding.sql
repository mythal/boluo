UPDATE binding
SET paused_reason = NULL, paused_at = NULL, updated_at = ?2
WHERE id = ?1;
