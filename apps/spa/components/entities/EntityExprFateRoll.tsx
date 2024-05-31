import type { FC } from 'react';
import { type FateResult, type FateRoll } from '../../interpreter/entities';
import { EntityExprFateDice as FateDice } from './EntityExprFateDice';

interface Props {
  node: FateRoll | FateResult;
}

export const EntityExprFateRoll: FC<Props> = ({ node }) => {
  if ('value' in node) {
    return (
      <div className="inline-flex h-full items-end gap-0.5">
        {node.values.map((x, i) => (
          <FateDice key={i} value={x} />
        ))}
      </div>
    );
  } else {
    return (
      <div className="inline-flex h-full items-end gap-0.5">
        <FateDice value={null} />
        <FateDice value={null} />
        <FateDice value={null} />
        <FateDice value={null} />
      </div>
    );
  }
};
