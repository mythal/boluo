import clsx from 'clsx';
import { type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { Delay } from '../Delay';
import { FallbackIcon } from '../FallbackIcon';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  color?: string;
  icon?: ReactNode;
  children: ReactNode;
  interactive?: boolean;
  pressed?: boolean;
  ref?: Ref<HTMLSpanElement>;
}

export const NameBox = ({
  children,
  color,
  icon = null,
  interactive = false,
  pressed,
  ref,
  ...props
}: Props) => {
  return (
    <span
      ref={ref}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={pressed}
      className={clsx(
        'NameBox',
        'bg-name-bg aria-pressed:bg-name-editable-hover irc:w-48 relative mr-1 w-32 flex-none rounded-sm font-bold break-all @xl:w-40',
        interactive && 'hover:bg-name-editable-hover cursor-pointer select-text focus:ring',
      )}
      {...props}
    >
      <span className="mx-1" style={{ color }}>
        {children}
      </span>
      {icon && <Delay fallback={<FallbackIcon />}>{icon}</Delay>}
    </span>
  );
};
