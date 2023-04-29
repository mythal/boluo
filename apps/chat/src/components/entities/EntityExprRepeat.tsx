import { FC } from 'react';
import { Repeat, RepeatResult } from '../../interpreter/entities';
import { EntityExprNode } from './EntityExprNode';
import { EntityExprNodeUnknown } from './EntityExprUnknown';

interface Props {
  node: Repeat | RepeatResult;
}

export const EntityExprRepeat: FC<Props> = ({ node: repeat }) => {
  const { node, count } = repeat;
  if (count === 0) {
    return <EntityExprNodeUnknown />;
  }
  if ('value' in repeat) {
    const xs = repeat.evaluated.map((node, key) => <EntityExprNode key={key} node={node} />);
    return <div className="inline-flex flex-wrap gap-1">[{xs}]={repeat.value}</div>;
  } else {
    const xs = Array(count).fill(0).map((_, key) => <EntityExprNode key={key} node={node} />);
    return <div className="inline-flex flex-wrap gap-1">[{xs}]</div>;
  }
};
