INSERT INTO notes (
    id,
    space_id,
    title,
    keywords,
    tags,
    creator_id,
    text,
    entities,
    access_policy,
    access_channel_id
)
VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    ($9::text)::access_policy,
    $10
);
