SELECT spaces
FROM spaces
WHERE spaces.owner_id = $1 AND spaces.deleted = false;
