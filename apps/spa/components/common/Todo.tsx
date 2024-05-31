import { FC } from 'react';
import { IS_DEVELOPMENT } from '../../const';

export const Todo: FC<{ children: string }> = ({ children }) => {
  if (!IS_DEVELOPMENT) {
    return null;
  }
  return (
    <span>
      <span className="bg-brand-600 text-lowest inline-block rounded px-1 py-0.5 text-xs">TODO</span>{' '}
      <span className="italic">{children}</span>
    </span>
  );
};
