import React from 'react';
import { FailedUnexpected } from './common/Failed';
import { ErrorBoundary } from '@sentry/react';

export const PaneBodyError = ({ children }: { children: React.ReactNode }) => {
  return (
    <ErrorBoundary fallback={({ error, eventId }) => <FailedUnexpected error={error} eventId={eventId} />}>
      {children}
    </ErrorBoundary>
  );
};
