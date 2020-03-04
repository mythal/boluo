import { Dispatch } from './components/App';
import { AppError, errorText } from './api/error';

export const maxDate = new Date(8640000000000000);
export const minDate = new Date(-8640000000000000);

export const unwrap = (): never => {
  throw new Error();
};

export const never: never = undefined as never;

export const throwErr = (dispatch: Dispatch) => (err: AppError) => {
  const message = errorText(err);
  dispatch({ type: 'NEW_ALERT', level: 'ERROR', message });
};
