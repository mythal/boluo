import clsx from 'clsx';
import { type ResolvedTheme } from '@boluo/types';
import { type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { Delay } from '../Delay';
import { FallbackIcon } from '../FallbackIcon';
import { getNameStrokeStyle } from './nameStroke';

export { getNameStrokeStyle, type NameStrokeSurface } from './nameStroke';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  color?: string;
  theme?: ResolvedTheme;
  inGame?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  interactive?: boolean;
  pressed?: boolean;
  ref?: Ref<HTMLSpanElement>;
}

const inGameNameBoxSurface = { type: 'name-box', inGame: true } as const;
const outOfGameNameBoxSurface = { type: 'name-box', inGame: false } as const;

export const NameBox = ({
  children,
  color,
  theme = 'light',
  inGame = false,
  icon = null,
  interactive = false,
  pressed,
  ref,
  className,
  style,
  ...props
}: Props) => {
  const nameStrokeStyle = getNameStrokeStyle(
    color,
    theme,
    inGame ? inGameNameBoxSurface : outOfGameNameBoxSurface,
  );
  return (
    <span
      {...props}
      ref={ref}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={pressed}
      style={style == null ? nameStrokeStyle : { ...nameStrokeStyle, ...style }}
      className={clsx(
        'NameBox',
        'bg-name-bg aria-pressed:bg-name-editable-hover irc:w-48 relative mr-1 w-32 flex-none rounded-sm font-bold break-all @xl:w-40',
        'stroke-name',
        interactive && 'hover:bg-name-editable-hover cursor-pointer select-text focus:ring',
        className,
      )}
    >
      <span className="mx-1 text-(--name-color)">{children}</span>
      {icon && <Delay fallback={<FallbackIcon />}>{icon}</Delay>}
    </span>
  );
};
