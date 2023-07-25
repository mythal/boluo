import clsx from 'clsx';
import { X } from 'icons';
import { FC, useCallback } from 'react';
import { Button } from 'ui/Button';
import Icon from 'ui/Icon';
import { Banner, useSetBanner } from '../hooks/useBanner';

interface Props {
  banner: Banner;
}
export const PaneBanner: FC<Props> = ({ banner }) => {
  const setBanner = useSetBanner();
  const closeBanner = useCallback(() => setBanner(null), [setBanner]);
  const level = banner.level ?? 'INFO';
  return (
    <div
      className={clsx(
        'flex items-center justify-between p-4 text-sm',
        level === 'INFO' && 'bg-surface-100',
        level === 'WARNING' && 'bg-warning-50',
        level === 'ERROR' && 'bg-error-50',
      )}
    >
      {banner.content}
      <Button data-small onClick={closeBanner}>
        <Icon icon={X} />
      </Button>
    </div>
  );
};
