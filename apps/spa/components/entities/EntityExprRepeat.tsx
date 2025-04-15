import { type FC } from 'react';
import { type EvaluatedExprNode, type ExprNode } from '@boluo/api';
import { EntityExprNode } from './EntityExprNode';
import { EntityExprNodeUnknown } from './EntityExprUnknown';
import { useIsTopLevel } from '../../hooks/useIsTopLevel';
import { Result } from './Result';
import type { MaybeEvalutedExprOf } from '@boluo/api';

interface Props {
  node: MaybeEvalutedExprOf<'Repeat'>;
}

export const RepeatItem: FC<{ item: ExprNode | EvaluatedExprNode | 0 }> = ({ item }) => {
  if (item === 0) {
    return <span className="px-2">+</span>;
  }
  return <EntityExprNode node={item} />;
};

export const EntityExprRepeat: FC<Props> = ({ node: repeat }) => {
  const topLevel = useIsTopLevel();
  const { node, count } = repeat;
  if (count === 0) {
    return <EntityExprNodeUnknown />;
  }
  const nodeList: Array<0 /* delimiter */ | ExprNode | EvaluatedExprNode> = [];
  for (let i = 0; i < count; i++) {
    if ('value' in repeat) {
      nodeList.push(repeat.evaluated[i] ?? 0);
    } else {
      nodeList.push(node);
    }
    nodeList.push(0);
  }
  nodeList.pop();
  return (
    <span className="EntityExprRepeat">
      &#123;{' '}
      {nodeList.map((item, key) => (
        <RepeatItem item={item} key={key} />
      ))}{' '}
      &#125;
      {'value' in repeat && <Result final={topLevel}>{repeat.value}</Result>}
    </span>
  );
};
