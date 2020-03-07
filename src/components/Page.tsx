import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { NotFound } from './NotFound';
import { Catalog } from './Catalog';
import { Welcome } from './Welcome';
import { useMy } from './Provider';
import { AlertList } from './AlertList';
import { Sidebar } from './sidebar/Sidebar';
import { SpacePage } from './SpacePage';
import { ChannelChat } from './chat/ChannelChat';

interface Props {}

export const Page: React.FC<Props> = () => {
  const my = useMy();
  return (
    <div className="h-screen-true w-screen">
      <AlertList />
      <div className="h-full flex w-full">
        <Sidebar />
        <div className="flex-1 h-full">
          <Switch>
            <Route exact path="/">
              {my === 'GUEST' ? <Welcome /> : <Catalog />}
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
