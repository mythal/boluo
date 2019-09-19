import React from 'react';
import { Pane } from '../Pane/Pane';
import { PaneView } from '../Pane/PaneView';
import { Sidebar } from '../Sidebar/Sidebar';
import { usePanes } from '../App/App';

export const Main: React.FC = () => {
  const panes = usePanes();
  const panesMapper = (pane: Pane) => <PaneView key={pane.id} pane={pane} />;
  return (
    <main>
      <Sidebar />
      <div className="panes">{panes.map(panesMapper)}</div>
    </main>
  );
};
