import React, { type FC, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { Failed } from '@boluo/ui/Failed';
import { LoadFailed } from '@boluo/ui/LoadFailed';
import { ErrorBoundary } from '@sentry/nextjs';
import { isApiError } from '@boluo/api';
import { isChunkLoadError } from '@boluo/utils/errors';

export const ChatContentErrorBoundry: FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary fallback={({ error, eventId }) => <ShowError error={error} eventId={eventId} />}>
    {children}
  </ErrorBoundary>
);

export const ShowError: FC<{ error: unknown; eventId: string }> = ({ error, eventId }) => {
  return (
    <div className="p-pane">
      {isChunkLoadError(error) ? (
        <Failed
          title={<FormattedMessage defaultMessage="Oops" />}
          code={isApiError(error) ? error.code : undefined}
          message={
            <FormattedMessage
              defaultMessage="Please send {errorCode} to the system administrator."
              values={{ errorCode: <span className="font-mono">{eventId}</span> }}
            />
          }
        />
      ) : (
        <LoadFailed />
      )}
    </div>
  );
};
