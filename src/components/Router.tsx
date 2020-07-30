import React from 'react';
import { Route, Switch } from 'react-router-dom';
import GuestHome from './pages/GuestHome';
import My from './pages/My';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import SignUp from './pages/SignUp';
import Profile from './pages/Profile';
import NewSpace from './pages/NewSpace';
import SpacePage from './pages/SpacePage';
import ExploreSpace from './pages/ExploreSpace';
import BasePage from './templates/BasePage';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import 'sanitize.css';
import 'sanitize.css/typography.css';
import Design from './pages/Design';
import Loading from './molecules/Loading';
import { useIsLoggedIn } from '@/hooks';

interface Props {}

function GuestRouter() {
  return (
    <BasePage>
      <Switch>
        <Route path="/login">
          <Login />
        </Route>
        <Route path="/sign-up">
          <SignUp />
        </Route>
        <Route path="/profile/:id">
          <Profile />
        </Route>
        <Route path="/space/explore">
          <ExploreSpace />
        </Route>
        <Route path="/space/:id">
          <SpacePage />
        </Route>
        <Route path="/" exact>
          <GuestHome />
        </Route>
        <Route path="/">
          <NotFound />
        </Route>
      </Switch>
    </BasePage>
  );
}

function LoggedInRouter() {
  return (
    <BasePage>
      <Switch>
        <Route path="/" exact>
          <My />
        </Route>
        <Route path="/my" exact>
          <My />
        </Route>
        <Route path="/profile/:id">
          <Profile />
        </Route>
        <Route path="/profile" exact>
          <Profile />
        </Route>
        <Route path="/space/new">
          <NewSpace />
        </Route>
        <Route path="/space/explore">
          <ExploreSpace />
        </Route>
        <Route path="/space/:id">
          <SpacePage />
        </Route>
        <Route path="/settings">
          <Settings />
        </Route>
        <Route path="/loading">
          <Loading />
        </Route>
        <Route path="/">
          <NotFound />
        </Route>
      </Switch>
    </BasePage>
  );
}

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
