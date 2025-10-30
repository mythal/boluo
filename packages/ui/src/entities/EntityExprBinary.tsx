import { type ReactNode, type FC } from 'react';
import { type Binary, type BinaryResult } from '@boluo/api';
import { EntityExprNode } from './EntityExprNode';
import { IsTopLevelContext, useIsTopLevel } from './top-level';
import { Result } from './Result';

interface Props {
  node: Binary | BinaryResult;
}

export const EntityExprBinary: FC<Props> = ({ node }) => {
  const isTopLevel = useIsTopLevel();
  let result: ReactNode = null;
  if (isTopLevel && 'value' in node) {
    result = <Result final>{node.value}</Result>;
  }
  const entityNode = (
    <span className="EntityExprBinary">
      <EntityExprNode node={node.l} />
      {node.op}
      <EntityExprNode node={node.r} />
      {result}
    </span>
  );
  return isTopLevel ? (
    <IsTopLevelContext value={false}>{entityNode}</IsTopLevelContext>
  ) : (
    entityNode
  );
};
