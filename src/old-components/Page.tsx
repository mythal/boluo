import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { NotFound } from './NotFound';
import { Catalog } from './Catalog';
import { Welcome } from './Welcome';
import { useProfile } from './Provider';
import { InformationList } from './InformationList';
import { Sidebar } from './sidebar/Sidebar';
import { SpacePage } from './SpacePage';
import { ChannelChat } from './chat/ChannelChat';

interface Props {}

export const Page: React.FC<Props> = () => {
  const profile = useProfile();
  return (
    <div className="h-screen-true w-screen">
      <InformationList />
      <div className="h-full flex w-full">
        <Sidebar />
        <div className="flex-1 h-full">
          <Switch>
            <Route exact path="/">
              {profile ? <Catalog /> : <Welcome />}
            </Route>
            <Route path="/space/:id">
              <SpacePage />
            </Route>
            <Route path="/channel/:id">
              <ChannelChat />
            </Route>
            <Route path="/">
              <NotFound />
            </Route>
          </Switch>
        </div>
      </div>
    </div>
  );
};
