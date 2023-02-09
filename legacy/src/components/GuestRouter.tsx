import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import ExploreSpace from '../components/pages/ExploreSpace';
import GuestHome from '../components/pages/GuestHome';
import Login from '../components/pages/Login';
import NotFound from '../components/pages/NotFound';
import Profile from '../components/pages/Profile';
import SignUp from '../components/pages/SignUp';
import SpacePage from '../components/pages/SpacePage';
import BasePage from '../components/templates/BasePage';
import ResetPassword from './pages/ResetPassword';
import ResetPasswordConfirm from './pages/ResetPasswordConfirm';

export function GuestRouter() {
  return (
    <BasePage>
      <Switch>
        <Route path="/login">
          <Login />
        </Route>
        <Route path="/reset-password">
          <ResetPassword />
        </Route>
        <Route path="/confirm-password-reset/:token">
          <ResetPasswordConfirm />
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
