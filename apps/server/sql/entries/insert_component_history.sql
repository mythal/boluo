INSERT INTO entry_component_history (
    operation_id,
    operator_id,
    scope_id,
    entry_id,
    source_message_id,
    key,
    component_type,
    action,
    data,
    schema_version
)
SELECT
    $1,
    $2,
    scope.id,
    $4,
    $5,
    $6,
    $7,
    ($8::text)::entry_component_history_action,
    $9,
    $10
FROM scopes scope
WHERE scope.id = $3
  AND (
      $5::uuid IS NULL
      OR EXISTS (
          SELECT 1
          FROM messages message
          JOIN channels channel ON channel.id = message.channel_id
          WHERE message.id = $5
            AND channel.space_id = scope.space_id
      )
  );
