import { type ReactNode, type FC } from 'react';
import type { MaybeEvalutedExprOf } from '@boluo/api';
import { EntityExprNode } from './EntityExprNode';
import { useIsTopLevel } from './top-level';
import { Result } from './Result';

interface Props {
  node: MaybeEvalutedExprOf<'Max'>;
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
