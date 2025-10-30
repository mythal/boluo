import { type ReactNode, type FC } from 'react';
import { EntityExprNode } from './EntityExprNode';
import { Result } from './Result';
import { useIsTopLevel } from './top-level';
import type { MaybeEvalutedExprOf } from '@boluo/api';

interface Props {
  node: MaybeEvalutedExprOf<'Min'>;
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
