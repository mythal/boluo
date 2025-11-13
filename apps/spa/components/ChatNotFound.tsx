import { useMemo } from 'react';
import { ChatView } from './ChatView';

export const ChatNotFound = () => {
  const defaultPane = useMemo(() => {
    return (
      <div className="ChatNotFound flex h-full w-full items-center justify-center">Not found</div>
    );
  }, []);
  return <ChatView defaultPane={defaultPane} />;
};
