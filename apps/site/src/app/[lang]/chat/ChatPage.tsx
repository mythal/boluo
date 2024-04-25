'use client';

import { ChatSkeleton } from '@boluo/chat/components/ChatSkeleton';
import type { FC, ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { Loading as LoadingUi } from '@boluo/ui/Loading';

const Chat = React.lazy(() => import('@boluo/chat/components/Chat'));

export const ChatPage: FC = () => {
  return <Chat />;
};
