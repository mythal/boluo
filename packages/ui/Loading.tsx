import type { FC } from 'react';
import { Spinner } from './Spinner';

export type LoadingType = 'inline' | 'block';

interface Props {
  type?: LoadingType;
}

export const Loading: FC<Props> = ({ type = 'block' }) => {
  const label = 'Loading';
  if (type === 'inline') {
    return (
      <span className="text-sm">
        <Spinner className="mr-1" /> {label}
      </span>
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center text-lg">
      <Spinner className="mr-1" /> {label}
    </div>
  );
};
