import clsx from 'clsx';
import { X } from '@boluo/icons';
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
        'pl-pane group/banner flex items-center justify-between py-2 pr-[6px] text-sm',
        level === 'INFO' && 'bg-banner-info-bg',
        level === 'WARNING' && 'bg-banner-warning-bg',
        level === 'ERROR' && 'bg-banner-error-bg',
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
      className="bg-banner-close-bg/50 group-hover/banner:bg-banner-close-bg inline-flex rounded-sm p-1.5 text-sm"
    >
      <X />
    </button>
  );
};
