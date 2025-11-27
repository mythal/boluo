import { Bell } from '@boluo/icons';
import clsx from 'clsx';
import { type FC } from 'react';
import { useIntl } from 'react-intl';
import { useNotificationSwitch } from '../../hooks/useNotificationSwitch';
import { type User } from '@boluo/api';
import { Button } from '@boluo/ui/Button';

export const AppOperations: FC<{ currentUser: User | null | undefined }> = ({ currentUser }) => {
  return (
    <div className="flex justify-end px-4 pt-4">
      {currentUser != null && <NotificationSwitch />}
    </div>
  );
};

export const NotificationSwitch: FC = () => {
  const intl = useIntl();
  const { canNotify, startNotify, stopNotify } = useNotificationSwitch();
  const title = canNotify
    ? intl.formatMessage({ defaultMessage: 'Turn off notification' })
    : intl.formatMessage({ defaultMessage: 'Turn on notification' });

  const handleClick = () => {
    if (canNotify) {
      stopNotify();
    } else {
      startNotify();
    }
  };

  return (
    <Button
      small
      aria-pressed={canNotify}
      onClick={handleClick}
      title={title}
      className={clsx('relative')}
    >
      <Bell />
      <span
        aria-hidden
        className={clsx(
          'absolute top-1 right-1 block h-1 w-1 rounded-full',
          canNotify ? 'bg-action-toggle-indicator-on' : 'bg-action-toggle-indicator-off',
        )}
      />
    </Button>
  );
};
