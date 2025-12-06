import clsx from 'clsx';
import { type FC, type ReactNode, useState } from 'react';
import { ContentGuardButton } from './ContentGuardButton';

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
        <ContentGuardButton
          onReveal={() => {
            setRevealed(true);
          }}
        />
      )}
    </div>
  );
};
