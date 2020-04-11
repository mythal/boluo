import React from 'react';
import { Dispatch } from './old-components/Provider';
import { AppError, errorText } from './api/error';
import { showError } from './actions/information';

export const unwrap = (): never => {
  throw new Error();
};

export const throwErr = (dispatch: Dispatch) => (err: AppError) => {
  dispatch(showError(<span>{errorText(err)}</span>));
};
