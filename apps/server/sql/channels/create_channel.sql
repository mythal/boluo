INSERT INTO channels (space_id, name, is_public, default_dice_type, "type")
    VALUES ($1, $2, $3, COALESCE($4, 'd20'), $5)
RETURNING
    channels AS "channel!: Channel";

