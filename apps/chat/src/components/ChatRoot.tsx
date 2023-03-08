import { useMe } from 'common';
import { FC } from 'react';
import { LoginForm } from './account/LoginForm';
import { ChatSkeleton } from './ChatSkeleton';
import { PaneBox } from './PaneBox';

const Login: FC = () => {
  return (
    <div className="chat-grid">
      <div className="border-r border-b-1/2 border-b-gray-400"></div>
      <div className="border-r w-48"></div>
      <PaneBox>
        <div className="text-surface-800">
          <LoginForm />
        </div>
      </PaneBox>
    </div>
  );
};

export const ChatRoot: FC = () => {
  const me = useMe();
  if (!me) {
    return <Login />;
  }
  return (
    <ChatSkeleton>
      {me ? <div>Chat</div> : <Login />}
    </ChatSkeleton>
  );
};
