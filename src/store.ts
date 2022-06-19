import { applyMiddleware, createStore } from 'redux';
import thunk, { ThunkDispatch } from 'redux-thunk';
import { applicationReducer, ApplicationState, initApplicationState } from './reducers';
import { Action } from './actions';
import { useDispatch as useReduxDispatch, useSelector as useReduxSelector } from 'react-redux';
import { composeWithDevTools } from '@redux-devtools/extension';

export const store = createStore(applicationReducer, initApplicationState, composeWithDevTools(applyMiddleware(thunk)));

export type Dispatch = ThunkDispatch<ApplicationState, unknown, Action>;

export const useDispatch = (): Dispatch => {
  return useReduxDispatch<Dispatch>();
};

export function useSelector<T>(mapper: (state: ApplicationState) => T, equalityFn?: (a: T, b: T) => boolean): T {
  return useReduxSelector<ApplicationState, T>(mapper, equalityFn);
}

export default store;
