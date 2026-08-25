WITH snapshot_rows (value) AS (
    -- Activity lives in space_activity and is reconciled separately in memory.
    SELECT jsonb_build_array('space', to_jsonb(space))::text
    FROM spaces space
    WHERE space.id = $1
      AND space.deleted = FALSE

    UNION ALL

    SELECT jsonb_build_array('settings', extension.space_id, extension.xmin::text)::text
    FROM spaces_extension extension
    WHERE extension.space_id = $1

    UNION ALL

    SELECT jsonb_build_array('channel', channel.id, channel.xmin::text)::text
    FROM channels channel
    WHERE channel.space_id = $1
      AND channel.deleted = FALSE

    UNION ALL

    SELECT jsonb_build_array('character', character.id, character.xmin::text)::text
    FROM characters character
    WHERE character.space_id = $1

    UNION ALL

    SELECT jsonb_build_array(
        'character_identifier',
        identifier.character_id,
        identifier.value,
        identifier.xmin::text
    )::text
    FROM character_identifiers identifier
    WHERE identifier.space_id = $1

    UNION ALL

    SELECT jsonb_build_array('note', note.id, note.xmin::text)::text
    FROM notes note
    WHERE note.space_id = $1

    UNION ALL

    SELECT jsonb_build_array('scope', scope.id, scope.xmin::text)::text
    FROM scopes scope
    WHERE scope.space_id = $1

    UNION ALL

    SELECT jsonb_build_array('entry', entry.id, entry.xmin::text)::text
    FROM entries entry
    INNER JOIN scopes scope ON scope.id = entry.scope_id
    WHERE scope.space_id = $1

    UNION ALL

    SELECT jsonb_build_array(
        'entry_identifier',
        identifier.entry_id,
        identifier.value,
        identifier.xmin::text
    )::text
    FROM entry_identifiers identifier
    INNER JOIN entries entry ON entry.id = identifier.entry_id
    INNER JOIN scopes scope ON scope.id = entry.scope_id
    WHERE scope.space_id = $1

    UNION ALL

    SELECT jsonb_build_array('space_member', member.user_id, member.xmin::text)::text
    FROM space_members member
    WHERE member.space_id = $1

    UNION ALL

    SELECT jsonb_build_array(
        'channel_member',
        member.channel_id,
        member.user_id,
        member.xmin::text
    )::text
    FROM channel_members member
    INNER JOIN channels channel ON channel.id = member.channel_id
    WHERE channel.space_id = $1
      AND channel.deleted = FALSE
      AND member.is_joined = TRUE
)
SELECT
    count(*)::bigint AS row_count,
    COALESCE(bit_xor(hashtextextended(value, 0)), 0)::bigint AS xor_a,
    COALESCE(bit_xor(hashtextextended(value, 1)), 0)::bigint AS xor_b
FROM snapshot_rows;
