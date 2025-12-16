import * as Sentry from '@sentry/nextjs';
import { IS_DEVELOPMENT } from './const';

const canSendSentry =
  typeof Sentry.withScope === 'function' && typeof Sentry.captureMessage === 'function';

export const recordWarn = (message: string, extras?: Record<string, unknown>) => {
  if (IS_DEVELOPMENT || !canSendSentry) {
    console.warn(message, extras);
    return;
  }
  Sentry.withScope((scope) => {
    scope.setLevel('warning');
    if (extras) {
      scope.setExtras(extras);
    }
    Sentry.captureMessage(message);
  });
};

export const recordError = (message: string, extras?: Record<string, unknown>) => {
  if (IS_DEVELOPMENT || !canSendSentry) {
    console.error(message, extras);
    return;
  }
  Sentry.withScope((scope) => {
    scope.setLevel('error');
    if (extras) {
      scope.setExtras(extras);
    }
    Sentry.captureMessage(message);
  });
};
