import { type FC } from 'react';
import { type ExprEntity } from '@boluo/api';
import { EntityExprNode } from './EntityExprNode';

interface Props {
  source: string;
  entity: ExprEntity;
  level?: number;
}

export const EntityExpr: FC<Props> = ({ entity }) => {
  return <EntityExprNode node={entity.node} />;
};
