import { type FC, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export const RollBox: FC<Props> = ({ children }) => {
  return (
    <span className="RollBox bg-surface-default/50 border-border-subtle hover:bg-surface-interactive-hover hover:border-border-default rounded-sm border px-1 py-px text-sm">
      {children}
    </span>
  );
};
