import clsx from 'clsx';
import { type FC, type ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  onClick?: () => void;
  children: ReactNode;
}

export const Badge: FC<Props> = ({ icon, children, onClick }) => {
  const clickable = onClick != null;
  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      className={clsx(
        'Badge bg-surface-canvas border-border-default inline-flex gap-1 rounded border px-1 py-0.5 text-xs',
        onClick != null
          ? 'hover:bg-surface-interactive-hover active:bg-surface-interactive-active hover:active:border-border-strong cursor-pointer select-none not-disabled:focus:ring'
          : '',
      )}
    >
      {icon}
      {children}
    </div>
  );
};
