import Refresh from '@boluo/icons/Refresh';
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { Button } from './Button';
import Icon from './Icon';
import clsx from 'clsx';

interface Props {
  className?: string;
  small?: boolean;
  children: ReactNode;
}

export const RefreshButton = ({ className, small = false, children }: Props) => {
  const refresh = useCallback(() => {
    location.reload();
  }, []);
  return (
    <Button
      aria-label="refresh"
      title="refresh"
      onClick={refresh}
      className={clsx('RefreshButton', className)}
      small={small}
    >
      <Icon icon={Refresh} />
      {children}
    </Button>
  );
};
