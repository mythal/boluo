import { FC } from 'react';
import { Roll, RollResult } from '../../interpreter/entities';

interface Props {
  node: Roll | RollResult;
}

export const EntityExprRoll: FC<Props> = ({ node }) => {
  return <span>{node.counter}d{node.face}</span>;
};
