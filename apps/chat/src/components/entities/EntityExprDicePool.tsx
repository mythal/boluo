import { FC } from 'react';
import { DicePool, DicePoolResult } from '../../interpreter/entities';
import { RollBox } from './RollBox';

interface Props {
  node: DicePool | DicePoolResult;
}

export const EntityExprDicePoolRoll: FC<Props> = ({ node }) => {
  return (
    <RollBox>
      Dice Pool
    </RollBox>
  );
};
