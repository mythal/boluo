import { FC, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export const RollBox: FC<Props> = ({ children }) => {
  return (
    <span className="bg-expr-bg border-surface-400/50 hover:border-surface-400 rounded-sm border px-1 py-[1px] text-sm">
      {children}
    </span>
  );
};
