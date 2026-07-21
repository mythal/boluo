SELECT COUNT(*)
FROM pragma_table_list
WHERE schema = 'main'
    AND name IN ('binding', 'channel_topic', 'boluo_cursor', 'message_map')
    AND strict = 1;
