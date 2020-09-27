import BasePage from '../components/templates/BasePage';
import { Redirect, Route, Switch } from 'react-router-dom';
import Login from '../components/pages/Login';
import SignUp from '../components/pages/SignUp';
import Profile from '../components/pages/Profile';
import ExploreSpace from '../components/pages/ExploreSpace';
import SpacePage from '../components/pages/SpacePage';
import GuestHome from '../components/pages/GuestHome';
import NotFound from '../components/pages/NotFound';
import React from 'react';

export function GuestRouter() {
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
        <Route path="/join/space/:id/:token">
          <Redirect to="/login" />
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

export default GuestRouter;
