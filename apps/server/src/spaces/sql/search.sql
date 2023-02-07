SELECT spaces
FROM spaces
WHERE deleted = false AND concat(name, ' ', description) LIKE ALL ($1)
LIMIT 1024;