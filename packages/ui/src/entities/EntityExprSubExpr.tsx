import { EntityExprNode } from './EntityExprNode';
import { IsTopLevelContext, useIsTopLevel } from './top-level';
import { type ReactNode } from 'react';
import { Result } from './Result';
import type { MaybeEvalutedExprOf } from '@boluo/api';

interface Props {
  node: MaybeEvalutedExprOf<'SubExpr'>;
}

export const EntityExprSubExpr = ({ node }: Props) => {
  const isTopLevel = useIsTopLevel();
  let resultNode: ReactNode = null;
  if (isTopLevel && 'value' in node) {
    resultNode = <Result final>{node.value}</Result>;
  }
  const entityNode = (
    <span className="EntityExprSubExpr">
      (<EntityExprNode node={node.node} />){resultNode}
    </span>
  );
  if (isTopLevel) {
    return <IsTopLevelContext value={false}>{entityNode}</IsTopLevelContext>;
  } else {
    return entityNode;
  }
};
