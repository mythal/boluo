UPDATE binding
SET paused_reason = ?2, paused_at = ?3, updated_at = ?3
WHERE id = ?1;
