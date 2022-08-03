import { applyMiddleware, createStore, Dispatch } from 'redux';
import { applicationReducer, ApplicationState, initApplicationState } from './reducers';
import { Action } from './actions';
import { useDispatch as useReduxDispatch, useSelector as useReduxSelector } from 'react-redux';
import { composeWithDevTools } from '@redux-devtools/extension';
import createSagaMiddleware from 'redux-saga';
import { rootSaga } from './states/sagas';

const sagaMiddleware = createSagaMiddleware();

export const store = createStore(
  applicationReducer,
  initApplicationState,
  composeWithDevTools(applyMiddleware(sagaMiddleware))
);
sagaMiddleware.run(rootSaga);
export type AppDispatch = Dispatch<Action>;

export const useDispatch = (): AppDispatch => {
  return useReduxDispatch<AppDispatch>();
};

export function useSelector<T>(mapper: (state: ApplicationState) => T, equalityFn?: (a: T, b: T) => boolean): T {
  return useReduxSelector<ApplicationState, T>(mapper, equalityFn);
}

export default store;
