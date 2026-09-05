import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import { type FC, type ReactNode, lazy, useMemo } from 'react';
import { PaneList } from './PaneList';
import { PaneWelcome } from './PaneWelcome';

const PaneLogin = lazy(() => import('./PaneLogin'));

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
