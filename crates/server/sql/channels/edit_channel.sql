UPDATE
    channels
SET
    name = COALESCE($2, name),
    topic = COALESCE($3, topic),
    default_dice_type = COALESCE($4, default_dice_type),
    default_roll_command = COALESCE($5, default_roll_command),
    is_public = COALESCE($6, is_public),
    is_document = COALESCE($7, is_document),
    "type" = COALESCE($8, "type"),
    is_archived = COALESCE($9, is_archived)
WHERE
    id = $1
    AND deleted = FALSE
RETURNING
    channels AS "channel!: Channel";
