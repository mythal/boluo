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
      className="text-action-secondary-text hover:enabled:bg-action-primary-bg/30 pressed:bg-action-primary-bg/50 disabled:bg-action-secondary-bg-disabled/50 disabled:text-action-secondary-text-disabled rounded-sm bg-transparent p-[0.5em] disabled:cursor-not-allowed"
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
