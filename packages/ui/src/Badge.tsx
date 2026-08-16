import clsx from 'clsx';
import { type ComponentPropsWithoutRef, type FC, type ReactNode, type Ref } from 'react';

interface Props extends Omit<ComponentPropsWithoutRef<'div'>, 'onClick'> {
  icon?: ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

export const Badge: FC<Props> = ({
  icon,
  children,
  onClick,
  onKeyDown,
  className,
  ref,
  ...props
}) => {
  const clickable = onClick != null;
  return (
    <div
      {...props}
      ref={ref}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (clickable && !event.defaultPrevented && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
      className={clsx(
        'Badge bg-surface-canvas border-border-default inline-flex gap-1 rounded border px-1 py-0.5 text-xs',
        onClick != null
          ? 'hover:bg-surface-interactive-hover active:bg-surface-interactive-active hover:active:border-border-strong cursor-pointer select-none not-disabled:focus:ring'
          : '',
        className,
      )}
    >
      {icon}
      {children}
    </div>
  );
};
