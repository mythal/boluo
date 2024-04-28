DELETE
FROM space_members
WHERE user_id = $1
  AND space_id = $2;
