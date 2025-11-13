import { memo } from 'react';
import { type EvaluatedExprNode, type ExprNode } from '@boluo/api';
import { EntityExprBinary } from './EntityExprBinary';
import { EntityExprCocRoll } from './EntityExprCocRoll';
import { EntityExprDicePoolRoll } from './EntityExprDicePool';
import { EntityExprFateRoll } from './EntityExprFateRoll';
import { EntityExprMax } from './EntityExprMax';
import { EntityExprMin } from './EntityExprMin';
import { EntityExprRepeat } from './EntityExprRepeat';
import { EntityExprRoll } from './EntityExprRoll';
import { EntityExprNodeUnknown } from './EntityExprUnknown';
import { EntityExprSubExpr } from './EntityExprSubExpr';

interface Props {
  node: ExprNode | EvaluatedExprNode;
}

export const EntityExprNode = memo<Props>(({ node }: Props) => {
  switch (node.type) {
    case 'Num':
      return node.value;
    case 'Binary':
      return <EntityExprBinary node={node} />;
    case 'Roll':
      return <EntityExprRoll node={node} />;
    case 'FateRoll':
      return <EntityExprFateRoll node={node} />;
    case 'CocRoll':
      return <EntityExprCocRoll node={node} />;
    case 'DicePool':
      return <EntityExprDicePoolRoll node={node} />;
    case 'Repeat':
      return <EntityExprRepeat node={node} />;
    case 'Max':
      return <EntityExprMax node={node} />;
    case 'Min':
      return <EntityExprMin node={node} />;
    case 'SubExpr':
      return <EntityExprSubExpr node={node} />;
    default:
      return <EntityExprNodeUnknown />;
  }
});

EntityExprNode.displayName = 'EntityExprNode';
