import type { FC } from 'react';
import { type FateResult, type FateRoll } from '../../interpreter/entities';
import { EntityExprFateDice as FateDice } from './EntityExprFateDice';
import clsx from 'clsx';

interface Props {
  node: FateRoll | FateResult;
}

export const EntityExprFateRoll: FC<Props> = ({ node }) => {
  const className = clsx('EntityExprFateRoll inline-flex h-full items-end gap-0.5');
  if ('value' in node) {
    return (
      <div className={className}>
        {node.values.map((x, i) => (
          <FateDice key={i} value={x} />
        ))}
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
