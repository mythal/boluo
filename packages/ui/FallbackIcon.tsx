import { memo } from 'react';

interface Props {
  placeholder?: string;
  className?: string;
}

export const FallbackIcon = memo<Props>(
  ({ placeholder = '⍰', className = 'inline-block w-[1em] h-[1em] text-surface-300' }: Props) => {
    return (
      <span aria-hidden className={className}>
        {placeholder}
      </span>
    );
  },
);
FallbackIcon.displayName = 'FallbackIcon';
