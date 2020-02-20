import React from 'react';
import { Route, Switch, RouteComponentProps } from 'react-router-dom';
import { FindSpace } from '../FindSpace/FindSpace';
import { SpacePage } from '../SpacePage/SpacePage';
import { NotFound } from '../NotFound/NotFound';
import { Header } from '../Header/Header';
import { AppErrorBoundary } from '../Error/AppErrorBoundary';
import { CreateSpacePage } from '../CreateSpacePage/CreateSpacePage';
import { Sidebar } from '../Sidebar/Sidebar';
import { Id } from '../id';
import { ChannelChat } from '../ChannelChat/ChannelChat';

interface IdParams {
  spaceId?: Id;
  channelId?: Id;
}

const renderSidebar = ({ match }: RouteComponentProps<IdParams>) => {
  return <Sidebar {...match.params} />;
};

export const Page: React.FC = () => {
  return (
    <div>
      <Switch>
        <Route path="/channel/:channelId" render={renderSidebar} />
        <Route path="/space/:spaceId" render={renderSidebar} />
        <Route path="/">
          <Sidebar />
        </Route>
      </Switch>
      <Switch>
        <Route path="/channel" />
        <Route path="/">
          <Header />
        </Route>
      </Switch>
      <AppErrorBoundary>
        <Switch>
          <Route exact path="/">
            <FindSpace />
          </Route>
          <Route path="/channel/:id">
            <ChannelChat />
          </Route>
          <Route path="/space/create">
            <CreateSpacePage />
          </Route>
          <Route path="/space/:id">
            <SpacePage />
          </Route>
          <Route path="/">
            <NotFound />
          </Route>
        </Switch>
      </AppErrorBoundary>
    </div>
  );
};
