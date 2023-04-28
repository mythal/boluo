import { FC } from 'react';
import { EvaluatedExprNode, ExprNode } from '../../interpreter/entities';
import { EntityExprBinary } from './EntityExprBinary';
import { EntityExprMax } from './EntityExprMax';
import { EntityExprMin } from './EntityExprMin';
import { EntityExprRepeat } from './EntityExprRepeat';
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
    case 'Repeat':
      return <EntityExprRepeat node={node} />;
    case 'Max':
      return <EntityExprMax node={node} />;
    case 'Min':
      return <EntityExprMin node={node} />;
    case 'SubExpr':
      return (
        <>
          (<EntityExprNode node={node.node} />)
        </>
      );
    case 'CocRoll':
    case 'FateRoll':
    case 'DicePool':
    case 'Unknown':
  }
  return <EntityExprNodeUnknown />;
};
