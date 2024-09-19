SELECT users as "users!: User" FROM users WHERE id = ANY($1) AND deactivated = false
