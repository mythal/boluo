import { Button } from './Button';
import { type FC, type ReactNode } from 'react';
import clsx from 'clsx';
import { useIntl } from 'react-intl';

export interface Banner {
  level?: 'ERROR' | 'WARNING' | 'INFO';
  content: ReactNode;
}
interface Props {
  banner: Banner;
  onDismiss?: () => void;
}

export const PaneBanner: FC<Props> = ({ banner, onDismiss }) => {
  const level = banner.level ?? 'INFO';

  const intl = useIntl();
  const label = intl.formatMessage({ defaultMessage: 'Dismiss' });
  return (
    <div
      className={clsx(
        'PaneBanner pl-pane group/banner flex items-center justify-between py-2 pr-1.5 text-sm',
        '[&_a]:decoration-text-link-decoration [&_a]:text-text-link [&_a:hover]:text-text-link-hover [&_a:active]:text-text-link-active [&_a]:underline',
        level === 'INFO' && 'bg-state-info-bg',
        level === 'WARNING' && 'bg-state-warning-bg',
        level === 'ERROR' && 'bg-state-danger-bg',
      )}
    >
      {banner.content}
      <Button small aria-label={label} onClick={onDismiss}>
        {label}
      </Button>
    </div>
  );
};
