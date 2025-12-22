import AlertTriangle from '@boluo/icons/AlertTriangle';
import Icon from './Icon';
import { Suspense, type FC, type ReactNode } from 'react';
import { SomethingWentWrong } from './SomethingWentWrong';
import React from 'react';

export interface FailedProps {
  title?: ReactNode;
  message?: ReactNode;
  icon?: ReactNode;
  code?: string;
  eventId?: string;
}

const EventId = React.lazy(() => import('./EventId'));

export const Failed: FC<FailedProps> = ({ title, message, code, icon, eventId }) => {
  const eventIdFallback = <EventIdFallback eventId={eventId || '???'} />;
  return (
    <div className="flex flex-col items-baseline gap-2">
      <h1 className="text-lg">
        {icon ?? <Icon icon={AlertTriangle} className="text-state-warning-text" />}{' '}
        {title || <SomethingWentWrong noKaomoji />}
      </h1>
      {message && <div>{message}</div>}
      {(code || eventId) && (
        <div className="text-text-muted font-mono text-xs">
          <span>{code}</span>
          {code && eventId && <span className="mx-1">·</span>}
          {eventId && (
            <Suspense fallback={eventIdFallback}>
              <EventId eventId={eventId} />
            </Suspense>
          )}
        </div>
      )}
    </div>
  );
};

const EventIdFallback: FC<{ eventId: string }> = ({ eventId }) => (
  <span className="underline decoration-dashed">{eventId.slice(0, 8)}</span>
);
