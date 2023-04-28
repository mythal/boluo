import { Dice } from 'icons';
import { FC, ReactNode } from 'react';
import { Roll, RollResult } from '../../interpreter/entities';
import { Delay } from '../Delay';
import { FallbackIcon } from '../FallbackIcon';

interface Props {
  node: Roll | RollResult;
}

export const EntityExprRoll: FC<Props> = ({ node }) => {
  let result: string = '';
  if ('value' in node) {
    if (node.values.length > 1) {
      result += `=[${node.values.join(', ')}]`;
    }
    let filter = '';
    if (node.filter) {
      const [type, number] = node.filter;
      filter = ` ${type}(${number}) `;
    }
    result += `${filter}=${node.value}`;
  }

  return (
    <span className="bg-surface-200 rounded-sm px-1 py-0.5">
      <span className="mr-1">
        <Delay fallback={<FallbackIcon />}>
          <Dice className="inline-block w-[1em] h-[1em]" />
        </Delay>
      </span>
      {node.counter}d{node.face}
      {result}
    </span>
  );
};
