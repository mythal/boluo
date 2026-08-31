WITH target_scope AS MATERIALIZED (
    SELECT id
    FROM scopes
    WHERE id = $1
    FOR UPDATE
),
target AS MATERIALIZED (
    SELECT entry.id
    FROM entries entry
    JOIN target_scope ON target_scope.id = entry.scope_id
    WHERE entry.id = $2
      AND entry.metadata_version = $3
    FOR UPDATE OF entry
),
upper_bound AS (
    SELECT entry.pos_p, entry.pos_q
    FROM entries entry
    JOIN target_scope ON target_scope.id = entry.scope_id
    WHERE entry.id = $4
      AND entry.id <> $2
),
lower_bound AS (
    SELECT entry.pos_p, entry.pos_q
    FROM entries entry
    JOIN target_scope ON target_scope.id = entry.scope_id
    WHERE entry.id <> $2
      AND (
          $4::uuid IS NULL
          OR entry.pos < (SELECT pos_p::double precision / pos_q FROM upper_bound)
      )
    ORDER BY entry.pos DESC
    LIMIT 1
),
position AS (
    SELECT
        (
            COALESCE((SELECT pos_p::bigint / pos_q FROM lower_bound), 0)
            + 1024
        )::integer AS p,
        1::integer AS q
    WHERE $4::uuid IS NULL

    UNION ALL

    SELECT intermediate.p, intermediate.q
    FROM find_intermediate(
        COALESCE((SELECT pos_p FROM lower_bound), 0),
        COALESCE((SELECT pos_q FROM lower_bound), 1),
        (SELECT pos_p FROM upper_bound),
        (SELECT pos_q FROM upper_bound)
    ) intermediate
    WHERE $4::uuid IS NOT NULL
      AND EXISTS (SELECT 1 FROM upper_bound)
),
updated AS (
    UPDATE entries entry
    SET pos_p = position.p,
        pos_q = position.q,
        metadata_version = uuidv7(),
        modified = now()
    FROM target, position
    WHERE entry.id = target.id
    RETURNING entry.id
)
SELECT id FROM updated;
