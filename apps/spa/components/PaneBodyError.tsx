import React from 'react';
import { ErrorBoundary, type FallbackRender } from '@sentry/nextjs';
import { Failed } from '@boluo/ui/Failed';
import { useIntl } from 'react-intl';
import { errorCode } from '@boluo/api';

export const PaneBodyError = ({ children }: { children: React.ReactNode }) => {
  const intl = useIntl();
  const fallback: FallbackRender = ({ eventId, error }) => {
    const title = intl.formatMessage({ defaultMessage: 'The pane has crashed' });
    const message = intl.formatMessage({
      defaultMessage: 'An unexpected error occurred. Please try again later.',
    });
    return (
      <div className="p-pane">
        <Failed message={message} title={title} code={errorCode(error)} eventId={eventId} />
      </div>
    );
  };
  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>;
};
