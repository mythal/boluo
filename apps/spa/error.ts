import * as Sentry from '@sentry/react';

export const recordWarn = (message: string, extras?: Record<string, unknown>) => {
  Sentry.withScope((scope) => {
    scope.setLevel('warning');
    if (extras) {
      scope.setExtras(extras);
    }
    Sentry.captureMessage(message);
  });
};

export const recordError = (message: string, extras?: Record<string, unknown>) => {
  Sentry.withScope((scope) => {
    scope.setLevel('error');
    if (extras) {
      scope.setExtras(extras);
    }
    Sentry.captureMessage(message);
  });
};
