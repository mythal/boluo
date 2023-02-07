UPDATE space_members
SET is_admin  = COALESCE($1, is_admin)
WHERE user_id = $2
  AND space_id = $3
RETURNING space_members;
