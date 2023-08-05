import { useMemo } from 'react';
import { ChatView } from './ChatView';

export const ChatNotFound = () => {
  const defaultPane = useMemo(() => {
    return <div className="h-full w-full flex items-center justify-center">Not found</div>;
  }, []);
  return <ChatView defaultPane={defaultPane} />;
};
