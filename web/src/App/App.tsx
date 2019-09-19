import React, { useContext, useReducer } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { appReducer } from './reducers';
import { appStateInit } from './state';
import { AppAction } from './actions';
import { List } from 'immutable';
import { Pane } from '../Pane/Pane';
import { Main } from '../Main/Main';
import { NotFound } from '../NotFound/NotFound';

const AppDispatch = React.createContext<(action: AppAction) => void>(
  () => new Error('The context does not be initialized.')
);

const AppPanes = React.createContext<List<Pane>>(List());

export const useDispatch = <T extends AppAction = AppAction>(): ((action: T) => void) => useContext(AppDispatch);

export const usePanes = (): List<Pane> => useContext(AppPanes);

const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, appStateInit);

  return (
    <AppDispatch.Provider value={dispatch}>
      <AppPanes.Provider value={state.panes}>
        <Router>
          <Switch>
            <Route path="/" exact component={Main} />
            <Route component={NotFound} />
          </Switch>
        </Router>
      </AppPanes.Provider>
    </AppDispatch.Provider>
  );
};

export default App;
