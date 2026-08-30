import { lighten } from 'polished';
import * as React from 'react';
import { cls } from '../../utils/classnames';

interface Props {
  color?: string;
  children: React.ReactNode;
  className?: string;
}

function Badge({ color = '#4a5568', children, className }: Props) {
  return (
    <span
      className={cls(
        'inline-block rounded-r-[2px] border-l-2 border-l-[var(--legacy-badge-border)] bg-[var(--legacy-badge-background)] px-1.5 py-px text-[0.75rem] whitespace-nowrap',
        className,
      )}
      style={
        {
          '--legacy-badge-background': color,
          '--legacy-badge-border': lighten(0.1, color),
        } as React.CSSProperties
      }
    >
      {children}
    </span>
  );
}

export default Badge;
