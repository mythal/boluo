import { Cubes } from 'icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { DicePool, DicePoolResult } from '../../interpreter/entities';
import { Delay } from '../Delay';
import { FallbackIcon } from '../FallbackIcon';
import { RollBox } from './RollBox';

interface Props {
  node: DicePool | DicePoolResult;
}

export const EntityExprDicePoolRoll: FC<Props> = ({ node }) => {
  return (
    <RollBox>
      <Delay fallback={<FallbackIcon />}>
        <Cubes className="inline" />
      </Delay>
      <span className="px-1">
        <FormattedMessage defaultMessage="Dice Pool" />
      </span>

      <span className="text-sm italic">
        <FormattedMessage defaultMessage="Work in progress" />
      </span>
      {'value' in node && (
        <span className="pl-1">
          ={node.value}
        </span>
      )}
    </RollBox>
  );
};
