import BasePage from '@/components/templates/BasePage';
import { Route, Switch } from 'react-router-dom';
import My from '@/components/pages/My';
import Profile from '@/components/pages/Profile';
import NewSpace from '@/components/pages/NewSpace';
import ExploreSpace from '@/components/pages/ExploreSpace';
import SpacePage from '@/components/pages/SpacePage';
import Settings from '@/components/pages/Settings';
import Loading from '@/components/molecules/Loading';
import NotFound from '@/components/pages/NotFound';
import Logout from '@/components/pages/Logout';
import React from 'react';

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
        <Route path="/logout">
          <Logout />
        </Route>
        <Route path="/">
          <NotFound />
        </Route>
      </Switch>
    </BasePage>
  );
}

export default LoggedInRouter;
