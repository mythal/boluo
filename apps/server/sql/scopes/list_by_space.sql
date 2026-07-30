SELECT
    id,
    space_id,
    kind AS "kind!: ScopeKind",
    owner_id,
    access_policy AS "access_policy!: AccessPolicy",
    access_channel_id,
    version,
    created,
    modified
FROM scopes
WHERE space_id = $1
ORDER BY id;
