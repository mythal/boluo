import { FC, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export const RollBox: FC<Props> = ({ children }) => {
  return (
    <span className="bg-surface-200 border-surface-300/75 shadow-1/2 shadow-surface-500/10 rounded-sm border px-1 py-0.5">
      {children}
    </span>
  );
};
