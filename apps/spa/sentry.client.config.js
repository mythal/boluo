import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tunnel: process.env.SENTRY_TUNNEL,
  attachStacktrace: true,
  integrations: [],
});
