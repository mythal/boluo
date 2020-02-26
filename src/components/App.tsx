import '../styles/main.css';
import React, { useContext, useEffect, useReducer, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Alert, initState, MyState } from '../states/states';
import { reducer } from '../states/reducers';
import { Action, LoggedIn, LoggedOut } from '../states/actions';
import { get } from '../api/request';
import { Loading } from './Loading';
import { Page } from './Page';
import { neverFn } from '../helper';
import { List } from 'immutable';

const DispatchContext = React.createContext<(action: Action) => void>(neverFn);

export type Dispatch = <T extends Action>(action: T) => void;
export const useDispatch = (): Dispatch => useContext(DispatchContext);

const MyContext = React.createContext<MyState>('GUEST');
export const useMy = (): MyState => useContext(MyContext);

const AlertListContext = React.createContext<List<Alert>>(List());
export const useAlertList = (): List<Alert> => useContext(AlertListContext);

const useGetMe = (dispatch: Dispatch, finish: () => void): void => {
  useEffect(() => {
    (async () => {
      const me = await get('/users/get_me');
      if (me.isOk && me.value !== null) {
        const { user, mySpaces, myChannels } = me.value;
        dispatch<LoggedIn>({ type: 'LOGGED_IN', user, myChannels, mySpaces });
      } else {
        dispatch<LoggedOut>({ type: 'LOGGED_OUT' });
      }
      finish();
    })();
  }, []);
};

export const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initState);
  const [loading, setLoading] = useState(true);
  useGetMe(dispatch, () => setLoading(false));
  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center">
        <Loading className="mx-auto w-32" />
      </div>
    );
  }
  // prettier-ignore
  return (
    <DispatchContext.Provider value={dispatch}>
    <MyContext.Provider value={state.my}>
    <AlertListContext.Provider value={state.alertList}>
    <BrowserRouter>
      <Page sidebar={state.appearance.sidebar} />
    </BrowserRouter>
    </AlertListContext.Provider>
    </MyContext.Provider>
    </DispatchContext.Provider>
  );
};
