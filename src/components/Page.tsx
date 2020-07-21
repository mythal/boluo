import React from 'react';
import { useProfile } from './Provider';
import 'modern-normalize/modern-normalize.css';
import { Route, Switch } from 'react-router-dom';
import GuestHome from './GuestHome';
import Home from '../Home';
import Login from './Login';
import NotFound from './NotFound';
import SignUp from './SignUp';

interface Props {}

export const Page: React.FC<Props> = () => {
  const profile = useProfile();
  if (profile) {
    return (
      <Switch>
        <Home />
      </Switch>
    );
  } else {
    return (
      <Switch>
        <Route path="/login">
          <Login />
        </Route>
        <Route path="/sign-up">
          <SignUp />
        </Route>
        <Route path="/" exact>
          <GuestHome />
        </Route>
        <Route path="/">
          <NotFound />
        </Route>
      </Switch>
    );
  }
};
