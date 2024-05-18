import React, { FC, ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { Failed } from '../common/Failed';
import { ErrorBoundary } from '@sentry/react';

export const ChatContentErrorBoundry: FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary fallback={(error) => <ShowError error={error} />}>{children}</ErrorBoundary>
);

export const ShowError: FC<{ error: unknown }> = ({ error }) => {
  return (
    <div>
      <Failed
        title={<FormattedMessage defaultMessage="Oops" />}
        error={error}
        message={<FormattedMessage defaultMessage="Unexpected error when displaying chat content" />}
      />
    </div>
  );
};
