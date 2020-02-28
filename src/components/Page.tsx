import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { NotFound } from './NotFound';
import { Catalog } from './Catalog';
import { Welcome } from './Welcome';
import { ComponentsPage } from './ComponentsPage';
import { useMy } from './App';
import { AlertList } from './AlertList';
import { AppHeader } from './AppHeader';
import { Sidebar } from './Sidebar';
import { SpacePage } from './SpacePage';
import { ChannelChat } from './chat/ChannelChat';

interface Props {
  sidebar: boolean;
}

export const Page: React.FC<Props> = ({ sidebar }) => {
  const my = useMy();
  return (
    <div className="flex flex-col h-screen w-screen">
      <AlertList />
      <AppHeader sidebar={sidebar} />
      <div className="flex-1 flex w-screen">
        {my === 'GUEST' ? null : <Sidebar my={my} open={sidebar} />}
        <div className="flex-1 h-full w-full">
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
            <Route path="/components">
              <ComponentsPage />
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
