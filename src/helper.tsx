import { Dispatch } from './components/App';
import { AppError, errorText } from './api/error';

export const neverFn = (): never => {
  throw new Error('Never say never.');
};

export const throwErr = (dispatch: Dispatch) => (err: AppError) => {
  const message = errorText(err);
  dispatch({ type: 'NEW_ALERT', level: 'ERROR', message });
};
