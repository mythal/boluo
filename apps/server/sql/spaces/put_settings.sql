INSERT INTO spaces_extension (space_id, settings)
    VALUES ($1, $2)
ON CONFLICT (space_id)
    DO UPDATE SET
        settings = EXCLUDED.settings;

