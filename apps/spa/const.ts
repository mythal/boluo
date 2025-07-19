/* eslint-disable no-restricted-globals */
export const IS_BROWSER = typeof window !== 'undefined';
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

export const IS_SAFARI = IS_BROWSER && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export const PING = '♥';
export const PONG = '♡';
export const ZERO_WIDTH_SPACE = '\u200b';

export type SentryConfig =
  | {
      enabled: true;
      dsn: string;
      tunnel: string | undefined;
    }
  | { enabled: false };

export const SENTRY_CONFIG: SentryConfig = (() => {
  if (process.env.SENTRY_DSN) {
    return {
      enabled: true,
      dsn: process.env.SENTRY_DSN,
      tunnel: process.env.SENTRY_TUNNEL,
    };
  } else {
    return {
      enabled: false,
    };
  }
})();
