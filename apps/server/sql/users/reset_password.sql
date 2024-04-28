UPDATE users
SET password = crypt($2, gen_salt('bf'))
WHERE id = $1;
