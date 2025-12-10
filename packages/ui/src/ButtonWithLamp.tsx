import { type FC } from 'react';
import { Button } from './Button';
import { LampSwitch } from './LampSwitch';

interface Props {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export const ButtonWithLamp: FC<Props> = ({ on, onClick, children }) => {
  return (
    <Button aria-pressed={on} onClick={onClick} className="relative">
      {children}
      <LampSwitch isOn={on} />
    </Button>
  );
};
