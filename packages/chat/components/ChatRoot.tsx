import { useMe } from 'common';
import { FC, ReactNode, useMemo } from 'react';
import { LoginForm } from './account/LoginForm';
import { ChatSkeleton } from './ChatSkeleton';
import { ChatView } from './ChatView';
import PaneLogin from './PaneLogin';

const Login: FC = () => {
  return (
    <ChatSkeleton>
      <LoginForm />
    </ChatSkeleton>
  );
};

export const ChatRoot: FC = () => {
  const me = useMe();
  const defaultPane: ReactNode = useMemo(() => {
    if (me === 'LOADING') {
      return null;
    }
    if (!me) {
      return <PaneLogin />;
    } else {
      return <div>{me.user.username}</div>;
    }
  }, [me]);
  return <ChatView defaultPane={defaultPane} />;
};
