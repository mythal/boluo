INSERT INTO characters (
    id,
    name,
    description,
    color,
    space_id,
    main_scope_id,
    tags
)
VALUES ($1, $2, $3, $4, $5, $6, $7);
