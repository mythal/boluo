import { type ReactNode, type FC } from 'react';
import { type Min, type MinResult } from '../../interpreter/entities';
import { EntityExprNode } from './EntityExprNode';
import { Result } from './Result';
import { useIsTopLevel } from '../../hooks/useIsTopLevel';

interface Props {
  node: Min | MinResult;
}

export const EntityExprMin: FC<Props> = ({ node: minNode }) => {
  const topLevel = useIsTopLevel();
  let result: ReactNode = null;
  if ('value' in minNode) {
    result = <Result final={topLevel}>{minNode.value}</Result>;
  }
  return (
    <div className="EntityExprMin inline-flex">
      min({<EntityExprNode node={minNode.node} />}){result}
    </div>
  );
};
