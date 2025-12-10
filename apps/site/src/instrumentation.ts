import * as Sentry from '@sentry/nextjs';
import { SENTRY_CONFIG } from './const';

export function register() {
  if (SENTRY_CONFIG.enabled) {
    Sentry.init({
      dsn: SENTRY_CONFIG.dsn,
      environment: 'development',
      // Set tracesSampleRate to 1.0 to capture 100%
      // of transactions for tracing.
      // We recommend adjusting this value in production
      // Learn more at
      // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
      tracesSampleRate: 1.0,
    });
  }
}
export const onRequestError = Sentry.captureRequestError;
