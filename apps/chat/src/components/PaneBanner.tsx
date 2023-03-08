import clsx from 'clsx';
import { X } from 'icons';
import { FC, useCallback } from 'react';
import { Button, Icon } from 'ui';
import { Banner, useSetBannel } from '../hooks/useBanner';

interface Props {
  banner: Banner;
}
export const PaneBanner: FC<Props> = ({ banner }) => {
  const setBanner = useSetBannel();
  const closeBanner = useCallback(() => setBanner(null), [setBanner]);
  const level = banner.level ?? 'INFO';
  return (
    <div
      className={clsx(
        'absolute top-full left-0 w-full z-10',
        'p-4 text-sm shadow-md ',
        level === 'INFO' && 'bg-surface-100',
        level === 'WARNING' && 'bg-warning-50',
        level === 'ERROR' && 'bg-error-50',
      )}
    >
      <Button data-small onClick={closeBanner} className="float-right ml-2 mb-2">
        <Icon icon={X} />
      </Button>
      {banner.content}
    </div>
  );
};
