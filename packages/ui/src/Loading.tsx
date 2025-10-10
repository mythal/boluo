import type { FC, ReactNode } from 'react';
import { Spinner } from './Spinner';
import { LoadingText } from './LoadingText';

export type LoadingType = 'inline' | 'block';

interface Props {
  type?: LoadingType;
  children?: ReactNode;
}

export const Loading: FC<Props> = ({ type = 'block', children }) => {
  children = children || <LoadingText />;
  if (type === 'inline') {
    return (
      <span className="Loading text-sm">
        <Spinner className="mr-1" /> {children}
      </span>
    );
  }
  return (
    <div className="Loading flex h-full w-full items-center justify-center text-lg">
      <Spinner className="mr-1" /> {children}
    </div>
  );
};
