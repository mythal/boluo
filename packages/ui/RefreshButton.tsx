import { Refresh } from 'icons';
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import type { StyleProps } from 'utils';
import { Button } from './Button';
import Icon from './Icon';

interface Props extends StyleProps {
  small?: boolean;
  children: ReactNode;
}

export const RefreshButton = ({ className, small = false, children }: Props) => {
  const refresh = useCallback(() => {
    location.reload();
  }, []);
  return (
    <Button aria-label="refresh" title="refresh" onClick={refresh} className={className} data-small={small}>
      <Icon icon={Refresh} />
      {children}
    </Button>
  );
};
