INSERT INTO entries (
    id,
    scope_id,
    display_name,
    reference_note_id,
    tags,
    pos_p,
    pos_q
)
WITH target_scope AS MATERIALIZED (
    SELECT id
    FROM scopes
    WHERE id = $2
    FOR UPDATE
),
upper_bound AS (
    SELECT entry.pos_p, entry.pos_q
    FROM entries entry
    JOIN target_scope ON target_scope.id = entry.scope_id
    WHERE entry.id = $6
),
lower_bound AS (
    SELECT entry.pos_p, entry.pos_q
    FROM entries entry
    JOIN target_scope ON target_scope.id = entry.scope_id
    WHERE entry.id <> $1
      AND (
          $6::uuid IS NULL
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
    WHERE $6::uuid IS NULL

    UNION ALL

    SELECT intermediate.p, intermediate.q
    FROM find_intermediate(
        COALESCE((SELECT pos_p FROM lower_bound), 0),
        COALESCE((SELECT pos_q FROM lower_bound), 1),
        (SELECT pos_p FROM upper_bound),
        (SELECT pos_q FROM upper_bound)
    ) intermediate
    WHERE $6::uuid IS NOT NULL
      AND EXISTS (SELECT 1 FROM upper_bound)
)
SELECT $1, target_scope.id, $3, $4, $5, position.p, position.q
FROM target_scope
CROSS JOIN position;
