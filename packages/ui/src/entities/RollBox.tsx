import { type FC, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export const RollBox: FC<Props> = ({ children }) => {
  return (
    <span className="bg-surface-selectable-default border-border-subtle hover:bg-surface-selectable-hover hover:border-border-default rounded-sm border px-1 py-px text-sm">
      {children}
    </span>
  );
};
