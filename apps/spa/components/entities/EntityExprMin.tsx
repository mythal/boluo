import { FC } from 'react';
import { Min, MinResult } from '../../interpreter/entities';
import { EntityExprNode } from './EntityExprNode';

interface Props {
  node: Min | MinResult;
}

export const EntityExprMin: FC<Props> = ({ node: minNode }) => {
  let result = '';
  if ('value' in minNode) {
    result = `=${minNode.value}`;
  }
  return (
    <div className="inline-flex">
      min({<EntityExprNode node={minNode.node} />}){result}
    </div>
  );
};
