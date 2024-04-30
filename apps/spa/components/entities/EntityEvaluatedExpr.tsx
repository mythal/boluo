import { FC } from 'react';
import { EntityExprNode } from './EntityExprNode';
import { EvaluatedExpr } from '../pane-channel/Content';

interface Props {
  source: string;
  entity: EvaluatedExpr;
  level?: number;
}

export const EntityEvaluatedExpr: FC<Props> = ({ entity }) => {
  return <EntityExprNode node={entity.node} />;
};
