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
      className="bg-action-secondary-bg text-action-secondary-text hover:enabled:bg-action-secondary-bg-hover disabled:bg-action-secondary-bg-disabled disabled:text-action-secondary-text-disabled rounded-sm p-[0.5em] disabled:cursor-not-allowed"
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
