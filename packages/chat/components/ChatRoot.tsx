import { useMe } from '@boluo/common';
import { FC, ReactNode, useMemo } from 'react';
import { ChatView } from './ChatView';
import PaneLogin from './PaneLogin';
import { PaneWelcome } from './PaneWelcome';

export const ChatRoot: FC = () => {
  const me = useMe();
  const defaultPane: ReactNode = useMemo(() => {
    if (me === 'LOADING') {
      return null;
    }
    if (!me) {
      return <PaneLogin />;
    } else {
      return <PaneWelcome />;
    }
  }, [me]);
  return <ChatView defaultPane={defaultPane} />;
};
