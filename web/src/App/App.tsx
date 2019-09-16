import React, { useContext, useReducer } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Sidebar } from '../Sidebar/Sidebar';
import { appReducer } from './reducers';
import { appStateInit } from './state';
import { AppAction } from './actions';
import { List } from 'immutable';
import { PaneView } from '../Pane/PaneView';
import { Pane } from '../Pane/Pane';

const AppDispatch = React.createContext<(action: AppAction) => void>(
  () => new Error('The context does not be initialized.')
);

const AppPanes = React.createContext<List<Pane>>(List());

export const useDispatch = <T extends AppAction = AppAction>(): ((action: T) => void) => useContext(AppDispatch);

export const usePanes = (): List<Pane> => useContext(AppPanes);

const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, appStateInit);
  const panes = state.panes.map(pane => <PaneView key={pane.id} pane={pane} />);

  return (
    <AppDispatch.Provider value={dispatch}>
      <AppPanes.Provider value={state.panes}>
        <Router>
          <Sidebar />
          {panes}
        </Router>
      </AppPanes.Provider>
    </AppDispatch.Provider>
  );
};

export default App;
