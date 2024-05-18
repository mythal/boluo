import { isApiError } from '@boluo/api';
import type { FC } from 'react';
import React from 'react';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { PaneErrorNotFound } from './PaneErrorNotFound';
import { FormattedMessage } from 'react-intl';
import { Failed, FailedUnexpected } from '../common/Failed';
import { ErrorBoundary } from '@sentry/react';

export const PaneError: FC<{ children: React.ReactNode }> = ({ children }) => {
  const fallback = (error: unknown) => {
    if (isApiError(error)) {
      if (error.code === 'NOT_FOUND') {
        return <PaneErrorNotFound error={error} />;
      } else {
        return <Failed title={<FormattedMessage defaultMessage="Oops!" />} error={error} />;
      }
    }
    return (
      <PaneBox
        grow
        header={
          <PaneHeaderBox>
            <FormattedMessage defaultMessage="Oops!" />
          </PaneHeaderBox>
        }
      >
        <div className="p-pane">
          <FailedUnexpected error={error} />
        </div>
      </PaneBox>
    );
  };
  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>;
};
