import Prando from 'prando';
import { FC, useEffect, useState } from 'react';
import { EvaluatedExprNode, ExprNode } from '../../interpreter/entities';
import { evaluate } from '../../interpreter/eval';
import { EntityExprNode } from './EntityExprNode';

interface Props {
  source: string;
  node: ExprNode;
  rng?: Prando;
  level?: number;
}

export const EntityExpr: FC<Props> = ({ node, rng }) => {
  if (rng) {
    const evaluated = evaluate(node, rng);
    return <EntityExprNode node={evaluated} />;
  } else {
    return <EntityExprNode node={node} />;
  }
};
