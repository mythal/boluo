import clsx from 'clsx';
import { type FC, type ReactNode, useState } from 'react';
import { FormattedMessage } from 'react-intl';

interface Props {
  active: boolean;
  children: ReactNode;
}

export const ContentGuard: FC<Props> = ({ active, children }) => {
  const [revealed, setRevealed] = useState(!active);
  const hidden = active && !revealed;
  return (
    <div className={clsx(active && 'relative')}>
      <div aria-hidden={hidden}>{children}</div>
      {hidden && (
        <button
          type="button"
          className={clsx(
            'ContentGuard',
            'absolute inset-0 flex w-full items-center justify-center',
            'bg-surface-unit/70 hover:bg-surface-unit/50',
            'text-text-primary focus-visible:outline-surface-inverted cursor-pointer rounded px-4 py-2 text-center text-sm backdrop-blur-xs transition focus-visible:outline focus-visible:outline-offset-2',
          )}
          onClick={(event) => {
            event.stopPropagation();
            setRevealed(true);
          }}
        >
          <FormattedMessage defaultMessage="Reveal" />
        </button>
      )}
    </div>
  );
};
