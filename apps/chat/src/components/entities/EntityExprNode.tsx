import { FC } from 'react';
import { EvaluatedExprNode, ExprNode } from '../../interpreter/entities';
import { EntityExprBinary } from './EntityExprBinary';
import { EntityExprRoll } from './EntityExprRoll';
import { EntityExprNodeUnknown } from './EntityExprUnknown';

interface Props {
  node: ExprNode | EvaluatedExprNode;
}

export const EntityExprNode: FC<Props> = ({ node }) => {
  switch (node.type) {
    case 'Num':
      return <>{node.value}</>;
    case 'Binary':
      return <EntityExprBinary node={node} />;
    case 'Roll':
      return <EntityExprRoll node={node} />;
    case 'Max':
    case 'Min':
    case 'SubExpr':
    case 'CocRoll':
    case 'FateRoll':
    case 'DicePool':
    case 'Repeat':
    case 'Unknown':
  }
  return <EntityExprNodeUnknown />;
};
