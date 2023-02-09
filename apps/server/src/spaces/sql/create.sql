INSERT INTO spaces (name, owner_id, password, default_dice_type, description)
VALUES ($1, $2, COALESCE($3, ''), COALESCE($4, 'd20'), $5)
RETURNING spaces;
