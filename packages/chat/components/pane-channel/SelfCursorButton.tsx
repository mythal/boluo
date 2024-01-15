import { FC, ReactNode } from 'react';

interface Props {
  onClick?: () => void;
  children: ReactNode;
}

export const SelfCursorButton: FC<Props> = ({ onClick, children }) => {
  return (
    <button
      onClick={onClick}
      className="hover:bg-highest/10 text-text-base p-2 text-xl first-of-type:rounded-l last-of-type:rounded-r"
    >
      {children}
    </button>
  );
};
