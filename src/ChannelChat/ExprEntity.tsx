import React from 'react';
import { ExprNode } from '../entities';

interface Props {
  node: ExprNode;
  seed?: number[];
}

export const ExprEntity: React.FC<Props> = ({ node }) => {
  if (node.type === 'Num') {
    return <div>{node.value}</div>;
  } else if (node.type === 'Roll') {
    return (
      <div>
        {node.counter}D{node.face}
      </div>
    );
  } else if (node.type === 'Binary') {
    return (
      <div className="entity entity-binary">
        <ExprEntity node={node.l} /> {node.op} <ExprEntity node={node.r} />
      </div>
    );
  } else {
    return <div>[不支持]</div>;
  }
};
