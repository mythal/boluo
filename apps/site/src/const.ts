/* eslint-disable no-restricted-globals */
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_BROWSER = typeof window !== 'undefined';
export const IS_SAFARI = IS_BROWSER && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export type SentryConfig =
  | {
      enabled: true;
      dsn: string;
    }
  | { enabled: false };

export const SENTRY_CONFIG: SentryConfig = (() => {
  if (process.env.SENTRY_DSN) {
    return {
      enabled: true,
      dsn: process.env.SENTRY_DSN,
    };
  } else {
    return {
      enabled: false,
    };
  }
})();
