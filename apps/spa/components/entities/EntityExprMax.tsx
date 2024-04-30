import { FC } from 'react';
import { Max, MaxResult } from '../../interpreter/entities';
import { EntityExprNode } from './EntityExprNode';

interface Props {
  node: Max | MaxResult;
}

export const EntityExprMax: FC<Props> = ({ node: maxNode }) => {
  let result = '';
  if ('value' in maxNode) {
    result = `=${maxNode.value}`;
  }
  return (
    <div className="inline-flex">
      max({<EntityExprNode node={maxNode.node} />}){result}
    </div>
  );
};
