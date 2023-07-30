import { isApiError } from 'api';
import { FC } from 'react';

interface Props {
  error: unknown;
}

export const ErrorDisplay: FC<Props> = ({ error }) => {
  if (isApiError(error)) {
    return <div>{error.code}</div>;
  } else {
    return <div>Unknown error</div>;
  }
};
