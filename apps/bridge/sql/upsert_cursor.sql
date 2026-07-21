INSERT INTO boluo_cursor (
    binding_id,
    timestamp,
    node,
    seq,
    updated_at
)
VALUES (?1, ?2, ?3, ?4, ?5)
ON CONFLICT (binding_id) DO UPDATE SET
    timestamp = excluded.timestamp,
    node = excluded.node,
    seq = excluded.seq,
    updated_at = excluded.updated_at;
