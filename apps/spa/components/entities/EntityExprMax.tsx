import { type ReactNode, type FC } from 'react';
import { type Max, type MaxResult } from '../../interpreter/entities';
import { EntityExprNode } from './EntityExprNode';
import { useIsTopLevel } from '../../hooks/useIsTopLevel';
import { Result } from './Result';

interface Props {
  node: Max | MaxResult;
}

export const EntityExprMax: FC<Props> = ({ node: maxNode }) => {
  const topLevel = useIsTopLevel();
  let result: ReactNode = null;
  if ('value' in maxNode) {
    result = <Result final={topLevel}>{maxNode.value}</Result>;
  }
  return (
    <div className="EntityExprMax inline-flex">
      max({<EntityExprNode node={maxNode.node} />}){result}
    </div>
  );
};
