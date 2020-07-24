import React from 'react';
import { useProfile } from './Provider';
import 'modern-normalize/modern-normalize.css';
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

interface Props {}

export const Router: React.FC<Props> = () => {
  const profile = useProfile();
  if (profile) {
    return (
      <BasePage>
        <Switch>
          <Route path="/" exact>
            <My profile={profile} />
          </Route>
          <Route path="/my" exact>
            <My profile={profile} />
          </Route>
          <Route path="/profile">
            <Profile profile={profile} />
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
            <Settings profile={profile} />
          </Route>
          <Route path="/">
            <NotFound />
          </Route>
        </Switch>
      </BasePage>
    );
  } else {
    return (
      <BasePage>
        <Switch>
          <Route path="/login">
            <Login />
          </Route>
          <Route path="/sign-up">
            <SignUp />
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
};
