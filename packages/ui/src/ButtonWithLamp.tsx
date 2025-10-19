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
    <Button on={on} onClick={onClick} className="relative">
      {children}
      <span>
        <span
          aria-label="status-indicator"
          className={clsx(
            'absolute top-[3px] right-[3px] h-[10px] w-[10px] rounded-full border-[1px]',
            on ? 'border-lamp-on-border bg-lamp-on-bg' : 'bg-lamp-off-bg border-lamp-off-border',
          )}
        >
          <span className="sr-only">{on ? 'On' : 'Off'}</span>
        </span>
      </span>
    </Button>
  );
};
