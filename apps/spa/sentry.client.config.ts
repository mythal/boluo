import * as Sentry from '@sentry/nextjs';
import { SENTRY_CONFIG } from './const';

if (SENTRY_CONFIG.enabled) {
  Sentry.init({
    dsn: SENTRY_CONFIG.dsn,
    environment: 'development',
    tunnel: SENTRY_CONFIG.tunnel,
    attachStacktrace: true,
    integrations: [],
  });
}
