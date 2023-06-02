import { useMe } from 'common';
import { FC } from 'react';
import { LoginForm } from './account/LoginForm';
import { ChatSkeleton } from './ChatSkeleton';

const Login: FC = () => {
  return (
    <ChatSkeleton>
      <LoginForm />
    </ChatSkeleton>
  );
};

export const ChatRoot: FC = () => {
  const me = useMe();
  if (!me) {
    return <Login />;
  }
  return (
    <ChatSkeleton placeholder="Chat">
      {me ? null : <Login />}
    </ChatSkeleton>
  );
};
