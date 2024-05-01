'use client';

import React, { useEffect, useState } from 'react';
import Chat from './Chat';
import { ChatSkeleton } from './ChatSkeleton';
import { useSetNavigation } from '../hooks/useSetNavigation';

export const App = () => {
  const [isClient, setIsClient] = useState(false);
  useSetNavigation();
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <ChatSkeleton />;

  return <Chat />;
};
