import clsx from 'clsx';
import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';

interface Props {
  onReveal: () => void;
  className?: string;
}

const CONTENT_GUARD_STRIPES = `repeating-linear-gradient(
  45deg,
  color-mix(in srgb, var(--color-surface-unit) 80%, var(--color-border-default) 20%) 0 12px,
  color-mix(in srgb, var(--color-surface-unit) 80%, var(--color-border-strong) 20%) 12px 24px
)`;

export const ContentGuardButton: FC<Props> = ({ onReveal, className }) => {
  return (
    <button
      type="button"
      className={clsx(
        'ContentGuard',
        'absolute inset-px flex items-center justify-center',
        'bg-surface-unit border-border-default hover:border-border-strong border',
        'text-text-primary focus-visible:border-border-focus cursor-pointer rounded px-4 py-2 text-center text-sm transition focus-visible:outline',
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        onReveal();
      }}
      style={{ backgroundImage: CONTENT_GUARD_STRIPES }}
    >
      <FormattedMessage defaultMessage="Reveal" />
    </button>
  );
};
