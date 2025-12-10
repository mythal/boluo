import { useDispatch as useReduxDispatch, useSelector as useReduxSelector } from 'react-redux';
import { applyMiddleware, createStore } from 'redux';
import { thunk, type ThunkDispatch } from 'redux-thunk';
import { type Action } from './actions';
import { applicationReducer, type ApplicationState, initApplicationState } from './reducers';

export const store = createStore(applicationReducer, initApplicationState, applyMiddleware(thunk));

export type Dispatch = ThunkDispatch<ApplicationState, unknown, Action>;

export const useDispatch = (): Dispatch => {
  return useReduxDispatch<Dispatch>();
};

export function useSelector<T>(
  mapper: (state: ApplicationState) => T,
  equalityFn?: (a: T, b: T) => boolean,
): T {
  return useReduxSelector<ApplicationState, T>(mapper, equalityFn);
}

export default store;
