INSERT INTO users (email, username, nickname, password)
VALUES ($1, $2, $3, crypt($4, gen_salt('bf')))
RETURNING users;
