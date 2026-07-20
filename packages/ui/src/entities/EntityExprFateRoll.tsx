import type { FC } from 'react';
import { type MaybeEvalutedExprOf } from '@boluo/api';
import { EntityExprFateDice as FateDice } from './EntityExprFateDice';
import clsx from 'clsx';

interface Props {
  node: MaybeEvalutedExprOf<'FateRoll'>;
}

export const EntityExprFateRoll: FC<Props> = ({ node }) => {
  const className = clsx('EntityExprFateRoll inline-flex h-full items-end gap-0.5');
  if ('values' in node) {
    const [first, second, third, fourth] = node.values;
    return (
      <div className={className}>
        <FateDice value={first} />
        <FateDice value={second} />
        <FateDice value={third} />
        <FateDice value={fourth} />
      </div>
    );
  } else {
    return (
      <div className={className}>
        <FateDice value={null} />
        <FateDice value={null} />
        <FateDice value={null} />
        <FateDice value={null} />
      </div>
    );
  }
};
