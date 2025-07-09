import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { useIsLoggedIn } from '../hooks/useIsLoggedIn';

const Design = React.lazy(() => import('./pages/Design'));
const Chat = React.lazy(() => import('./pages/Chat'));
const LoggedInRouter = React.lazy(() => import('./LoggedInRouter'));
const GuestRouter = React.lazy(() => import('./GuestRouter'));

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
