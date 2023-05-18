import React from 'react';
import { showFlash } from '../actions';
import { AppError, errorText } from '../api/error';
import { Dispatch } from '../store';

export const throwErr = (dispatch: Dispatch) => (err: AppError) => {
  dispatch(showFlash('ERROR', <span>{errorText(err).description}</span>));
};
