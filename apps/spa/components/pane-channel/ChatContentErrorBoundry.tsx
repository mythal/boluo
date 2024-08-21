import React, { type FC, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { Failed } from '../common/Failed';
import { ErrorBoundary } from '@sentry/nextjs';

export const ChatContentErrorBoundry: FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary fallback={({ error, eventId }) => <ShowError error={error} eventId={eventId} />}>
    {children}
  </ErrorBoundary>
);

export const ShowError: FC<{ error: unknown; eventId: string }> = ({ error, eventId }) => {
  return (
    <div>
      <Failed
        title={<FormattedMessage defaultMessage="Oops" />}
        error={error}
        message={
          <FormattedMessage
            defaultMessage="Please send {errorCode} to the system administrator."
            values={{ errorCode: <span className="font-mono">{eventId}</span> }}
          />
        }
      />
    </div>
  );
};
