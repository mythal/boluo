SELECT member
FROM space_members member
where user_id = $1 AND space_id = $2
LIMIT 1;
