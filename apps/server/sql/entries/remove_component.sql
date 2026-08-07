DELETE FROM entry_components
WHERE entry_id = $1
  AND component_type = $2;
