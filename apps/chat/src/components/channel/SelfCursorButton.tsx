import { FC, ReactNode } from 'react';

interface Props {
  onClick?: () => void;
  children: ReactNode;
}

export const SelfCursorButton: FC<Props> = ({ onClick, children }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 hover:bg-surface-600 text-surface-200 text-xl first-of-type:rounded-l last-of-type:rounded-r"
    >
      {children}
    </button>
  );
};
