import { AlertTriangle } from '@boluo/icons';
import Icon from '@boluo/ui/Icon';
import { type FC, type ReactNode } from 'react';
import { ErrorDisplay } from '../ErrorDisplay';
import { FormattedMessage } from 'react-intl';

export interface FailedProps {
  title?: ReactNode;
  message?: ReactNode;
  icon?: ReactNode;
  error?: unknown;
  eventId?: string;
}

export const Failed: FC<FailedProps> = ({ title, message, error, icon, eventId }) => (
  <div className="flex flex-col gap-2">
    {title && (
      <h1 className="text-lg">
        {icon ?? <Icon icon={AlertTriangle} className="text-failed-icon" />} {title}
      </h1>
    )}
    {message && <div>{message}</div>}
    {error !== undefined && (
      <div className="text-text-lighter text-sm">
        <ErrorDisplay error={error} />
      </div>
    )}
    {eventId && <div className="text-text-lighter font-mono text-xs">{eventId}</div>}
  </div>
);

export const FailedUnexpected: FC<{ error?: unknown; eventId?: string }> = ({ error, eventId }) => (
  <Failed
    title={<FormattedMessage defaultMessage="Oops! Something went wrong" />}
    message={<FormattedMessage defaultMessage="An unexpected error occurred. Please try again later." />}
    error={error}
    eventId={eventId}
  />
);
