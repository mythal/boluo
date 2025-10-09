import { type FC } from 'react';
import { IS_DEVELOPMENT } from '../../const';

export const Todo: FC<{ children: string }> = ({ children }) => {
  if (!IS_DEVELOPMENT) {
    return null;
  }
  return (
    <span>
      <span className="bg-brand-strong text-text-inverted inline-block rounded px-1 py-0.5 text-xs">
        TODO
      </span>{' '}
      <span className="italic">{children}</span>
    </span>
  );
};
