INSERT INTO entry_identifiers (scope_id, entry_id, value, kind)
SELECT
    $1,
    $2,
    identifier.value,
    CASE identifier.ordinality
        WHEN 1 THEN 'Primary'::identifier_kind
        ELSE 'Alias'::identifier_kind
    END
FROM unnest($3::text[]) WITH ORDINALITY AS identifier(value, ordinality);
