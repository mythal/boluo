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
      onClick={onClick}
      className={clsx(
        'Badge bg-badge-bg border-badge-border inline-flex gap-1 rounded-sm border px-1 py-0.5 text-xs',
        clickable && 'hover:bg-badge-hover cursor-pointer select-none active:translate-y-px',
      )}
    >
      {icon}
      {children}
    </div>
  );
};
