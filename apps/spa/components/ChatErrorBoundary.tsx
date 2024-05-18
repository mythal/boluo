import type { FC, ReactNode } from 'react';
import React from 'react';
import { ErrorBoundary } from '@sentry/react';

export const ChatErrorBoundary: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary fallback={({ error, eventId }) => <ChatError error={error} eventId={eventId} />}>
      {children}
    </ErrorBoundary>
  );
};

const ChatError: FC<{ error: unknown; eventId: string }> = ({ error, eventId }) => {
  return (
    <div className="flex flex-col gap-2 p-8">
      <h1 className="font-bold">Oops</h1>

      <p className="text-text-light">The application crash due to an unexpected error.</p>
      <p className="text-text-light">
        Please send this code to the system administrator: <span className="text-text-base font-mono">{eventId}</span>
      </p>
      <p className="font-pixel">.·°՞(つ ≧□≦)つ՞°·.</p>
    </div>
  );
};
