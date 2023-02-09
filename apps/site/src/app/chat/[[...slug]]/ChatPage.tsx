'use client';

import type { FC, ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { Loading as LoadingUi } from 'ui';
import { ChatNotFound } from '../../../components/chat/ChatNotFound';
import { ChatSkeleton } from './ChatSkeleton';

const Chat = React.lazy(() => import('../../../components/chat/Chat'));

interface RootRoute {
  type: 'ROOT';
}

interface SpaceRoute {
  type: 'SPACE';
  spaceId: string;
}

interface NotFoundRoute {
  type: 'NOT_FOUND';
}

export type ChatRoute = RootRoute | SpaceRoute | NotFoundRoute;

export const ChatPage: FC<{ route: ChatRoute }> = ({ route }) => {
  const [loading, setLoading] = useState<ReactNode | false>(<LoadingUi />);

  // To prevent SSR
  useEffect(() => setLoading(false), []);

  if (loading !== false) {
    return <ChatSkeleton>{loading}</ChatSkeleton>;
  }

  if (route.type === 'NOT_FOUND') {
    return <ChatNotFound />;
  }
  if (route.type === 'ROOT') {
    return <div>TODO</div>;
  }
  const { spaceId } = route;

  return <Chat key={spaceId} spaceId={spaceId} />;
};
