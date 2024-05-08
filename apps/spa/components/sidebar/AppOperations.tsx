import { Bell } from '@boluo/icons';
import clsx from 'clsx';
import { FC } from 'react';
import { useIntl } from 'react-intl';
import { useNotificationSwitch } from '../../hooks/useNotificationSwitch';

export const AppOperations: FC = () => {
  return (
    <div className="flex justify-end px-4 pt-4">
      <NotificationSwitch />
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
    <button
      aria-pressed={canNotify}
      onClick={handleClick}
      title={title}
      className={clsx(
        'relative rounded p-2',
        canNotify ? 'bg-surface-600 text-text-reverse shadow-inner' : 'hover:bg-surface-100 bg-white shadow-sm',
      )}
    >
      <Bell />
      <span
        aria-hidden
        className={clsx(
          'absolute right-1 top-1 block h-1 w-1 rounded-full',
          canNotify ? 'bg-green-400' : 'bg-surface-300',
        )}
      />
    </button>
  );
};
