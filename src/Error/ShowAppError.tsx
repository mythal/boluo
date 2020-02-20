import React from 'react';
import { AppError, errorText } from '../api/error';

interface Props {
  err: AppError;
}

export const ShowAppError: React.FC<Props> = ({ err }) => {
  return <div>{errorText(err)}</div>;
};
