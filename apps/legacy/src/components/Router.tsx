import React from 'react';
import { lazyWithRetry } from '@boluo/utils/lazy';
import { Route, Routes } from 'react-router-dom';
import { useIsLoggedIn } from '../hooks/useIsLoggedIn';

const Design = lazyWithRetry(() => import('./pages/Design'));
const Chat = lazyWithRetry(() => import('./pages/Chat'));
const LoggedInRouter = lazyWithRetry(() => import('./LoggedInRouter'));
const GuestRouter = lazyWithRetry(() => import('./GuestRouter'));

export const Router: React.FC = () => {
  const isLoggedIn = useIsLoggedIn();

  return (
    <Routes>
      <Route path="/design" element={<Design />} />
      <Route path="/chat/:spaceId/:channelId" element={<Chat />} />
      <Route path="/chat/:spaceId" element={<Chat />} />
      <Route path="*" element={isLoggedIn ? <LoggedInRouter /> : <GuestRouter />} />
    </Routes>
  );
};
