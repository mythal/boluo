import { FC } from 'react';
import { Expr } from '../../interpreter/entities';
import { EntityExprNode } from './EntityExprNode';

interface Props {
  source: string;
  entity: Expr;
  level?: number;
}

export const EntityExpr: FC<Props> = ({ entity }) => {
  return <EntityExprNode node={entity.node} />;
};
