import React from 'react';
import { AppError, errorText } from '@/api/error';
import { showError } from '@/actions/information';
import { Dispatch } from '@/store';

export const panic = (): never => {
  throw new Error();
};

export const throwErr = (dispatch: Dispatch) => (err: AppError) => {
  dispatch(showError(<span>{errorText(err).description}</span>));
};
