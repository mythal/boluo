'use client';

import React, { useEffect, useState } from 'react';
import Chat from '@boluo/chat/components/Chat';
import { ChatSkeleton } from '@boluo/chat/components/ChatSkeleton';

export const App = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  if (!isClient) return <ChatSkeleton />;

  return <Chat />;
};
