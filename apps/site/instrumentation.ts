import * as Sentry from '@sentry/nextjs';
import { SENTRY_CONFIG } from './src/const';

export function register() {
  if (!SENTRY_CONFIG.enabled) return;
  const sentryDsn = SENTRY_CONFIG.dsn;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,

      // Set tracesSampleRate to 1.0 to capture 100%
      // of transactions for tracing.
      // We recommend adjusting this value in production
      // Learn more at
      // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
      tracesSampleRate: 1.0,
    });
  }
}
