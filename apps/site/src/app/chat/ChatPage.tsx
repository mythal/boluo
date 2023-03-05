'use client';

import type { FC, ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { Loading as LoadingUi } from 'ui';
import { ChatSkeleton } from './ChatSkeleton';

const Chat = React.lazy(() => import('../../components/chat/Chat'));

export const ChatPage: FC = () => {
  const [loading, setLoading] = useState<ReactNode | false>(<LoadingUi />);

  // To prevent SSR
  useEffect(() => setLoading(false), []);

  if (loading !== false) {
    return <ChatSkeleton>{loading}</ChatSkeleton>;
  }
  return <Chat />;
};
