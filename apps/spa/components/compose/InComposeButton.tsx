import clsx from 'clsx';
import { type ReactNode } from 'react';

interface Props {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  pressed?: boolean;
  label?: string;
}

export const InComposeButton = ({ onClick, children, label, pressed, disabled = false }: Props) => {
  return (
    <button
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      className={clsx(
        'InComposeButton',
        'text-action-secondary-text cursor-pointer rounded-sm bg-transparent p-[0.5em]',
        'hover:enabled:bg-action-primary-bg/20',
        'pressed:bg-action-secondary-bg-active',
        'disabled:bg-action-secondary-bg-disabled/50 disabled:text-action-secondary-text-disabled disabled:cursor-not-allowed',
      )}
      onClick={onClick}
      onTouchEnd={(e) => {
        // https://stackoverflow.com/a/71725297
        e.preventDefault();
        onClick();
      }}
    >
      {children}
    </button>
  );
};
