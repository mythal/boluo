import { type FC } from 'react';
import { type Binary, type BinaryResult } from '../../interpreter/entities';
import { EntityExprNode } from './EntityExprNode';
import { IsTopLevelContext, useIsTopLevel } from '../../hooks/useIsTopLevel';

interface Props {
  node: Binary | BinaryResult;
}

export const EntityExprBinary: FC<Props> = ({ node }) => {
  const isTopLevel = useIsTopLevel();
  let result = '';
  if (isTopLevel && 'value' in node) {
    result = `=${node.value}`;
  }
  const entityNode = (
    <span className="EntityExprBinary">
      <EntityExprNode node={node.l} />
      {node.op}
      <EntityExprNode node={node.r} />
      {result}
    </span>
  );
  return isTopLevel ? <IsTopLevelContext.Provider value={false}>{entityNode}</IsTopLevelContext.Provider> : entityNode;
};
