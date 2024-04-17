import { ReactNode } from 'react';

interface Props {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  pressed?: boolean;
  title?: string;
}

export const InComposeButton = ({ onClick, children, title, pressed, disabled = false }: Props) => {
  return (
    <button
      disabled={disabled}
      title={title}
      aria-pressed={pressed}
      className="bg-compose-button-bg disabled:bg-transprent disabled:text-text-lighter hover:enabled:bg-compose-button-hover-bg rounded-sm p-[0.5em] disabled:cursor-not-allowed"
      onClick={onClick}
    >
      {children}
    </button>
  );
};
