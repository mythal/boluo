'use client';

import { ChatSkeleton } from 'chat/components/ChatSkeleton';
import type { FC, ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { Loading as LoadingUi } from 'ui/Loading';

const Chat = React.lazy(() => import('chat/components/Chat'));

export const ChatPage: FC = () => {
  const [loading, setLoading] = useState<ReactNode | false>(<LoadingUi />);

  // To prevent SSR
  useEffect(() => setLoading(false), []);

  if (loading !== false) {
    return <ChatSkeleton>{loading}</ChatSkeleton>;
  }
  return <Chat />;
};
