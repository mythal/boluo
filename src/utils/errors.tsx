import React from 'react';
import { AppError, errorText } from '../api/error';
import { AppDispatch } from '../store';
import { showFlash } from '../actions';

export const throwErr = (dispatch: AppDispatch) => (err: AppError) => {
  showFlash(dispatch, 'ERROR', <span>{errorText(err).description}</span>);
};
