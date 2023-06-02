import clsx from 'clsx';
import type { FC, ReactNode } from 'react';

interface Props {
  value: number | null;
}

const FateDiceBox: FC<{ children: ReactNode; hidden?: boolean }> = ({ children, hidden }) => (
  <span
    className={clsx(
      'font-mono inline-flex items-center justify-center bg-brand-600 rounded-sm w-5 h-5 text-sm border border-brand-700 text-lowest',
      hidden && 'text-opacity-0',
    )}
  >
    {children}
  </span>
);

export const EntityExprFateDice: FC<Props> = ({ value }) => {
  switch (value) {
    case -1:
      return <FateDiceBox>-</FateDiceBox>;
    case 0:
      return <FateDiceBox hidden>0</FateDiceBox>;
    case 1:
      return <FateDiceBox>+</FateDiceBox>;
    default:
      return <FateDiceBox>?</FateDiceBox>;
  }
};
