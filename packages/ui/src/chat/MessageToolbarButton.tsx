import clsx from 'clsx';
import { type ReactNode, type Ref } from 'react';

interface Props extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  children: ReactNode;
  loading?: boolean;
  pressed?: boolean;
  optimistic?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export const MessageToolbarButton = ({
  children,
  pressed,
  loading = false,
  optimistic = false,
  ref,
  ...props
}: Props) => {
  return (
    <button
      ref={ref}
      aria-pressed={pressed}
      disabled={optimistic || props.disabled}
      className={clsx(
        'MessageToolbarButton',
        'text-action-toggle-text inline-flex h-[30px] w-[30px] items-center justify-center rounded-sm text-base transition-colors',
        optimistic ? 'cursor-progress' : 'cursor-pointer',
        pressed
          ? 'bg-action-toggle-selected-bg shadow-inner'
          : 'enabled:hover:bg-action-toggle-bg-hover',
        loading ? 'text-text-muted cursor-progress' : '',
      )}
      {...props}
    >
      {children}
    </button>
  );
};
