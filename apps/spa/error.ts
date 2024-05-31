import * as Sentry from '@sentry/react';
import { IS_DEVELOPMENT } from './const';

export const recordWarn = (message: string, extras?: Record<string, unknown>) => {
  if (IS_DEVELOPMENT) {
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
  if (IS_DEVELOPMENT) {
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
