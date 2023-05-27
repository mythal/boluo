import { Dice } from 'icons';
import { FC } from 'react';
import { Roll, RollResult } from '../../interpreter/entities';
import { Delay } from '../Delay';
import { FallbackIcon } from '../FallbackIcon';
import { RollBox } from './RollBox';

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
    <RollBox>
      <span className="mr-1">
        <Delay fallback={<FallbackIcon />}>
          <Dice className="inline-block w-[1em] h-[1em]" />
        </Delay>
      </span>
      {node.counter}d{node.face}
      {result}
    </RollBox>
  );
};
