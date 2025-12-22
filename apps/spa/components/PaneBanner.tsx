import clsx from 'clsx';
import X from '@boluo/icons/X';
import { type FC, useCallback } from 'react';
import { type Banner, useSetBanner } from '../hooks/useBanner';
import { useIntl } from 'react-intl';

interface Props {
  banner: Banner;
}
export const PaneBanner: FC<Props> = ({ banner }) => {
  const level = banner.level ?? 'INFO';
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
      <CloseBannerButton />
    </div>
  );
};

export const CloseBannerButton: FC = () => {
  const setBanner = useSetBanner();
  const closeBanner = useCallback(() => setBanner(null), [setBanner]);
  const intl = useIntl();
  const label = intl.formatMessage({ defaultMessage: 'Close' });
  return (
    <button
      aria-label={label}
      onClick={closeBanner}
      className="bg-surface-muted/50 group-hover/banner:bg-surface-muted inline-flex rounded-sm p-1.5 text-sm"
    >
      <X />
    </button>
  );
};
