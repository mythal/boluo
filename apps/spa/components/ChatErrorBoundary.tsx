import { useErrorExplain } from '@boluo/common';
import type { FC, ReactNode } from 'react';
import React from 'react';
import { ChatSkeleton } from './ChatSkeleton';
import { ErrorBoundary } from '@sentry/react';

const Explain: FC<{ error: unknown }> = ({ error }) => {
  const explain = useErrorExplain();
  return <>{explain(error)}</>;
};

export const ChatErrorBoundary: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary fallback={(error) => <ChatSkeleton placeholder={<Explain error={error} />} />}>
      {children}
    </ErrorBoundary>
  );
};
