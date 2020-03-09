import { Dispatch } from './components/Provider';
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

export const objectEqual = (a: object, b: object) => {
  for (const key of Object.getOwnPropertyNames(a)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    if (!Object.is(a[key], b[key])) {
      return false;
    }
  }
  return true;
};
