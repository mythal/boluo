import React from 'react';
import { Route, Switch } from 'react-router-dom';
import Loading from '../components/molecules/Loading';
import ExploreSpace from '../components/pages/ExploreSpace';
import Logout from '../components/pages/Logout';
import My from '../components/pages/My';
import NewSpace from '../components/pages/NewSpace';
import NotFound from '../components/pages/NotFound';
import Profile from '../components/pages/Profile';
import Settings from '../components/pages/Settings';
import SpacePage from '../components/pages/SpacePage';
import BasePage from '../components/templates/BasePage';

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
        <Route path="/join/space/:id/:token">
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
