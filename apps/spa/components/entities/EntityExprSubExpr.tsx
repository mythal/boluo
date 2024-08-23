import { EntityExprNode } from './EntityExprNode';
import { type SubExpr, type SubExprResult } from '../../interpreter/entities';
import { IsTopLevelContext, useIsTopLevel } from '../../hooks/useIsTopLevel';
import { type ReactNode } from 'react';

interface Props {
  node: SubExpr | SubExprResult;
}

export const EntityExprSubExpr = ({ node }: Props) => {
  const isTopLevel = useIsTopLevel();
  let resultNode: ReactNode = null;
  if (isTopLevel && 'value' in node) {
    resultNode = <span>={node.value}</span>;
  }
  const entityNode = (
    <span className="EntityExprSubExpr">
      (<EntityExprNode node={node.node} />){resultNode}
    </span>
  );
  if (isTopLevel) {
    return <IsTopLevelContext.Provider value={false}>{entityNode}</IsTopLevelContext.Provider>;
  } else {
    return entityNode;
  }
};
