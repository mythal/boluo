UPDATE spaces
SET deleted = true
WHERE id = $1;
