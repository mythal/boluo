import type { FC } from 'react';
import { FateResult, FateRoll } from '../../interpreter/entities';
import { EntityExprFateDice as FateDice } from './EntityExprFateDice';

interface Props {
  node: FateRoll | FateResult;
}

export const EntityExprFateRoll: FC<Props> = ({ node }) => {
  if ('value' in node) {
    return (
      <div className="inline-flex gap-0.5 items-end h-full">
        {node.values.map((x, i) => (
          <FateDice key={i} value={x} />
        ))}
      </div>
    );
  } else {
    return (
      <div className="inline-flex gap-0.5 items-end h-full">
        <FateDice value={null} />
        <FateDice value={null} />
        <FateDice value={null} />
        <FateDice value={null} />
      </div>
    );
  }
};
