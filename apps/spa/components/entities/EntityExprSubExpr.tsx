import { EntityExprNode } from './EntityExprNode';
import { type SubExpr, type SubExprResult } from '../../interpreter/entities';
import { IsTopLevelContext, useIsTopLevel } from '../../hooks/useIsTopLevel';
import { type ReactNode } from 'react';
import { Result } from './Result';

interface Props {
  node: SubExpr | SubExprResult;
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
