export const DEBUG = Boolean(process.env.DEBUG) || false;
export const PORT = Number(process.env.PORT) || 3005;

export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_ENABLE_EXPIRATION = Boolean(process.env.JWT_EXPIRATION);
export const JWT_EXPIRES_IN = '7 days';

export const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD;
export const POSTGRES_USERNAME = process.env.POSTGRES_USERNAME;
export const POSTGRES_PORT = Number(process.env.POSTGRES_PORT);
export const POSTGRES_HOST = process.env.POSTGRES_HOST;
export const POSTGRES_DATABASE = process.env.POSTGRES_DATABASE;

export const REDIS_HOST = process.env.REDIS_HOST;
export const REDIS_PORT = process.env.REDIS_PORT;
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
export const REDIS_DB = process.env.REDIS_DB;

export const KEEP_ALIVE_SEC = 5;
