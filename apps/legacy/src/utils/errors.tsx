import React from 'react';
import { showFlash } from '../actions';
import { type AppError, errorText } from '../api/error';
import { type Dispatch } from '../store';

export const throwErr = (dispatch: Dispatch) => (err: AppError) => {
  dispatch(showFlash('ERROR', <span>{errorText(err).description}</span>));
};
