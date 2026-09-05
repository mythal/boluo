import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import { lazyWithRetry } from '@boluo/utils/lazy';
import { type FC, type ReactNode, useMemo } from 'react';
import { PaneList } from './PaneList';
import { PaneWelcome } from './PaneWelcome';

const PaneLogin = lazyWithRetry(() => import('./PaneLogin'));

export const ChatInvite: FC<{ spaceId: string; token: string }> = () => {
  const { data: currentUser, isLoading } = useQueryCurrentUser();
  const defaultPane: ReactNode = useMemo(() => {
    if (isLoading) {
      return null;
    }
    if (!currentUser) {
      return <PaneLogin />;
    } else {
      return <PaneWelcome />;
    }
  }, [currentUser, isLoading]);
  return <PaneList defaultPane={defaultPane} />;
};
