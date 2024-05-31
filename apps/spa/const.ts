export const IS_BROWSER = typeof window !== 'undefined';
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const BACKEND_URL = process.env.PUBLIC_BACKEND_URL;
export const MEDIA_URL = process.env.PUBLIC_MEDIA_URL;
export const SENTRY_DSN = process.env.SENTRY_DSN;
export const APP_URL = process.env.APP_URL;
export const SITE_URL = process.env.SITE_URL;
export const SENTRY_TUNNEL = process.env.SENTRY_TUNNEL;
export const IS_SAFARI = IS_BROWSER && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export const PING = '♥';
export const PONG = '♡';
export const ZERO_WIDTH_SPACE = '\u200b';
