import { errorCode, isApiError } from '@boluo/api';
import type { FC } from 'react';
import React from 'react';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { PaneErrorNotFound } from './PaneErrorNotFound';
import { FormattedMessage } from 'react-intl';
import { ErrorBoundary, type FallbackRender } from '@sentry/nextjs';
import { Failed } from '@boluo/ui/Failed';
import { isChunkLoadError } from '@boluo/utils/errors';
import { LoadFailed } from '@boluo/ui/LoadFailed';

export const PaneError: FC<{ children: React.ReactNode }> = ({ children }) => {
  const fallback: FallbackRender = ({ error, eventId }) => {
    if (isChunkLoadError(error)) {
      <PaneBox
        initSizeLevel={1}
        header={
          <PaneHeaderBox>
            <FormattedMessage defaultMessage="Oops!" />
          </PaneHeaderBox>
        }
      >
        <div className="p-pane">
          <LoadFailed />
        </div>
      </PaneBox>;
    } else if (isApiError(error)) {
      if (error.code === 'NOT_FOUND') {
        return <PaneErrorNotFound error={error} />;
      } else {
        return (
          <Failed title={<FormattedMessage defaultMessage="Oops!" />} code={errorCode(error)} />
        );
      }
    }
    return (
      <PaneBox
        initSizeLevel={1}
        header={
          <PaneHeaderBox>
            <FormattedMessage defaultMessage="Oops!" />
          </PaneHeaderBox>
        }
      >
        <div className="p-pane">
          <Failed code={errorCode(error)} eventId={eventId} />
        </div>
      </PaneBox>
    );
  };
  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>;
};
