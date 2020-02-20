import React from 'react';
import { ExprNode } from '../entities';
import '../style.css';

interface Props {
  node: ExprNode;
  seed?: number[];
}

export const ExprEntity: React.FC<Props> = ({ node }) => {
  if (node.type === 'Num') {
    return <div className="inline text-lg">{node.value}</div>;
  } else if (node.type === 'Roll') {
    return (
      <div className="inline-block">
        {node.counter}D{node.face}
      </div>
    );
  } else if (node.type === 'Binary') {
    return (
      <div className="inline-block">
        <ExprEntity node={node.l} /> {node.op} <ExprEntity node={node.r} />
      </div>
    );
  } else {
    return <div className="inline">[不支持]</div>;
  }
};
