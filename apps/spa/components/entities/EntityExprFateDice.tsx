import clsx from 'clsx';
import type { FC, ReactNode } from 'react';

interface Props {
  value: number | null;
}

const FateDiceBox: FC<{ children: ReactNode; hidden?: boolean }> = ({ children, hidden }) => (
  <span
    className={clsx(
      'bg-entity-fate-dice-bg border-entity-fate-dice-border text-text-inverted inline-flex h-5 w-5 items-center justify-center rounded-sm border font-mono text-sm',
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
