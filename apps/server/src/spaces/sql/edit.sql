UPDATE spaces
SET name              = COALESCE($2, name),
    description       = COALESCE($3, description),
    default_dice_type = COALESCE($4, default_dice_type),
    explorable        = COALESCE($5, explorable),
    is_public         = COALESCE($6, is_public),
    allow_spectator   = COALESCE($7, allow_spectator)
WHERE id = $1
RETURNING spaces;
