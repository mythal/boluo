import AlertCircle from '@boluo/icons/AlertCircle';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from '../Button';
import { explainError } from '@boluo/locale/errors';
import { Activity, useMemo, useState } from 'react';

interface Props {
  icon?: React.ReactNode;
  error?: unknown;
  children: React.ReactNode;
  onDismiss?: () => void;
}

export const FailedBanner = ({ icon, error, children, onDismiss }: Props) => {
  const [show, setShow] = useState(true);
  const handleDismiss = () => {
    setShow(false);
    if (onDismiss) {
      onDismiss();
    }
  };
  const intl = useIntl();
  const explainText = useMemo(() => {
    if (error != null) {
      return explainError(intl, error);
    }
    return null;
  }, [error, intl]);
  return (
    <Activity mode={show ? 'visible' : 'hidden'}>
      <div className="bg-state-warning-bg border-state-warning-border [&_a]:decoration-text-link-decoration [&_a]:text-text-link [&_a:hover]:text-text-link-hover [&_a:active]:text-text-link-active flex flex-wrap items-center gap-2 border-y px-3 py-2 [&_a]:underline">
        <span className="text-text-muted">{icon ?? <AlertCircle />}</span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {children}
          {error != null && (
            <div className="text-text-muted max-h-12 min-w-0 flex-1 overflow-hidden text-sm">
              {explainText}
            </div>
          )}
        </div>
        <Button small onClick={handleDismiss}>
          <FormattedMessage defaultMessage="Dismiss" />
        </Button>
      </div>
    </Activity>
  );
};
