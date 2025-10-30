import { type FC } from 'react';
import { EntityExprNode } from './EntityExprNode';
import { type EvaluatedExpr } from '@boluo/api';

interface Props {
  source: string;
  entity: EvaluatedExpr;
  level?: number;
}

export const EntityEvaluatedExpr: FC<Props> = ({ entity }) => {
  return <EntityExprNode node={entity.node} />;
};
