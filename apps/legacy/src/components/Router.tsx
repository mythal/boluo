import React, { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useIsLoggedIn } from '../hooks/useIsLoggedIn';
import GuestRouter from './GuestRouter';
import LoggedInRouter from './LoggedInRouter';

const Design = lazy(() => import('./pages/Design'));
const Chat = lazy(() => import('./pages/Chat'));

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
