UPDATE users
SET deactivated = true
WHERE id = $1;
