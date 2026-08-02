INSERT INTO scopes (
    id,
    space_id,
    kind,
    owner_id,
    access_policy,
    access_channel_id
)
SELECT
    $1,
    space.id,
    'Character',
    $3,
    ($4::text)::access_policy,
    $5
FROM spaces space
WHERE space.id = $2;
