import { useQueryUser } from '@boluo/common';
import { FC, ReactNode, useMemo } from 'react';
import { ChatView } from './ChatView';
import PaneLogin from './PaneLogin';
import { PaneWelcome } from './PaneWelcome';

export const ChatRoot: FC = () => {
  const { data: currentUser, isLoading } = useQueryUser();
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
  return <ChatView defaultPane={defaultPane} />;
};
