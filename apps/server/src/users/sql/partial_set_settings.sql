INSERT INTO users_extension (user_id, settings)
VALUES ($1, $2)
ON CONFLICT (user_id) DO UPDATE SET settings = users_extension.settings || $2
RETURNING users_extension.settings;
