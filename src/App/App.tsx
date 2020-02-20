import React, { useContext, useReducer, useState } from 'react';
import { reducer } from './reducers';
import { GUEST, initMyState, initState, MeState, My } from './states';
import { Action, LOGGED_IN, LOGGED_OUT, LoggedIn, LoggedOut } from './actions';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { useAsync } from '../hooks';
import { get } from '../api/request';
import { Logout } from '../Logout/Logout';
import { InformationList } from '../InformationList/InformationList';
import { LoginPage } from '../Login/LoginPage';
import { SignUpPage } from '../SignUp/SignUpPage';
import { Welcome } from '../Welcome/Welcome';
import { Loading } from '../Loading/Loading';
import { Page } from './Page';

const DispatchContext = React.createContext<(action: Action) => void>(() => {
  console.warn();
});

export type Dispatch = <T extends Action>(action: T) => void;

export const useDispatch = (): (<T extends Action>(action: T) => void) => {
  return useContext(DispatchContext);
};

const MeContext = React.createContext<MeState>(GUEST);
export const useMe = (): MeState => useContext(MeContext);

const MyContext = React.createContext<My>(initMyState);
export const useMy = (): My => useContext(MyContext);

const useGetMe = (dispatch: Dispatch, finish: () => void): void => {
  useAsync(async () => {
    const me = await get('/users/get_me');
    if (me.isOk && me.value !== null) {
      const { user, mySpaces, myChannels } = me.value;
      dispatch<LoggedIn>({ tag: LOGGED_IN, user, myChannels, mySpaces });
    } else {
      dispatch<LoggedOut>({ tag: LOGGED_OUT });
    }
    finish();
  }, []);
};

export const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [state, dispatch] = useReducer(reducer, initState);
  useGetMe(dispatch, () => setLoading(false));

  const my: My = {
    myChannels: state.myChannels,
    mySpaces: state.mySpaces,
  };

  if (loading) {
    return <Loading />;
  }
  return (
    <BrowserRouter>
      <DispatchContext.Provider value={dispatch}>
        <MyContext.Provider value={my}>
          <MeContext.Provider value={state.me}>
            <InformationList informationList={state.informationList} />
            <Switch>
              <Route exact path="/">
                {state.me === GUEST ? <Welcome /> : <Page />}
              </Route>
              <Route exact path="/login">
                <LoginPage />
              </Route>
              <Route exact path="/sign_up">
                <SignUpPage />
              </Route>
              <Route exact path="/logout">
                <Logout />
              </Route>
              <Route path="/">
                <Page />
              </Route>
            </Switch>
          </MeContext.Provider>
        </MyContext.Provider>
      </DispatchContext.Provider>
    </BrowserRouter>
  );
};
