UPDATE messages
SET
  (pos_p, pos_q) = (select p as pos_p, q as pos_q from find_intermediate($2, $3, $4, $5))
WHERE
  id = $1
RETURNING messages;
