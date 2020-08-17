import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { useIsLoggedIn } from '../hooks';

interface Props {}

const Design = React.lazy(() => import('./pages/Design'));
const Chat = React.lazy(() => import('./pages/Chat'));
const LoggedInRouter = React.lazy(() => import('./LoggedInRouter'));
const GuestRouter = React.lazy(() => import('./GuestRouter'));

export const Router: React.FC<Props> = () => {
  const isLoggedIn = useIsLoggedIn();

  return (
    <Switch>
      <Route path="/design">
        <Design />
      </Route>
      <Route path="/chat/:spaceId/:channelId">
        <Chat />
      </Route>
      <Route path="/chat/:spaceId">
        <Chat />
      </Route>
      <Route path="/">{isLoggedIn ? <LoggedInRouter /> : <GuestRouter />}</Route>
    </Switch>
  );
};
