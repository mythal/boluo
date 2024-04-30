'use client';

import React, { useEffect, useState } from 'react';
import Chat from './Chat';
import { ChatSkeleton } from './ChatSkeleton';

export const App = () => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  if (!isClient) return <ChatSkeleton />;

  return <Chat />;
};
