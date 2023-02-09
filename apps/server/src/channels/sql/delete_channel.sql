UPDATE channels
SET deleted = true, old_name = name, name = uuid_generate_v4()::text
WHERE id = $1 AND deleted = false;
