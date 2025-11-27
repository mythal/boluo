import { FC } from 'react';
import { Button } from './Button';
import clsx from 'clsx';

interface Props {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export const ButtonWithLamp: FC<Props> = ({ on, onClick, children }) => {
  return (
    <Button aria-pressed={on} onClick={onClick} className="relative">
      {children}
      <span>
        <span
          aria-label="status-indicator"
          className={clsx(
            'absolute top-[3px] right-[3px] h-2.5 w-2.5 rounded-full border',
            on ? 'border-lamp-on-border bg-lamp-on-bg' : 'bg-lamp-off-bg border-lamp-off-border',
          )}
        >
          <span className="sr-only">{on ? 'On' : 'Off'}</span>
        </span>
      </span>
    </Button>
  );
};
