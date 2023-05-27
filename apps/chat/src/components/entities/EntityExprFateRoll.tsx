import { FC } from 'react';
import { FateResult, FateRoll } from '../../interpreter/entities';
import { RollBox } from './RollBox';

interface Props {
  node: FateRoll | FateResult;
}

export const EntityExprFateRoll: FC<Props> = ({ node }) => {
  return (
    <RollBox>
      FATE
    </RollBox>
  );
};
