import clsx from 'clsx';
import { type FC, type ReactNode } from 'react';

export const Result: FC<{ children: ReactNode; final?: boolean; noEqual?: boolean }> = ({
  children,
  final = false,
  noEqual = false,
}) => {
  return (
    <span>
      {!noEqual && <span>=</span>}
      <span className={clsx('Result', final ? 'text-expr-result font-bold' : 'decoration-expr-decoration underline')}>
        {children}
      </span>
    </span>
  );
};
