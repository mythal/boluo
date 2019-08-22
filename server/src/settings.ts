export const DEBUG = Boolean(process.env.DEBUG) || false;
export const PORT = Number(process.env.PORT) || 3005;

export const JWT_SECRET = process.env.JWT_SECRET;

export const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD;
export const POSTGRES_USERNAME = process.env.POSTGRES_USERNAME;
export const POSTGRES_PORT = Number(process.env.POSTGRES_PORT);
export const POSTGRES_HOST = process.env.POSTGRES_HOST;
export const POSTGRES_DATABASE = process.env.POSTGRES_DATABASE;
