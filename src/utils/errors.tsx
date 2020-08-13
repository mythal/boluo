import React from 'react';
import { AppError, errorText } from '@/api/error';
import { Dispatch } from '@/store';
import { showFlash } from '@/actions/flash';

export const throwErr = (dispatch: Dispatch) => (err: AppError) => {
  dispatch(showFlash('ERROR', <span>{errorText(err).description}</span>));
};
