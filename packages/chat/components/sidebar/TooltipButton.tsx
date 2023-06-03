import { FC, ReactNode } from 'react';

interface Props {
  onClick?: () => void;
  children: ReactNode;
}

export const TooltipButton: FC<Props> = ({ onClick, children }) => {
  return (
    <button
      onClick={onClick}
      className="text-pin-surface-50 bg-pin-surface-600 hover:bg-pin-surface-500 text-sm py-1 px-2 rounded-sm"
    >
      {children}
    </button>
  );
};
