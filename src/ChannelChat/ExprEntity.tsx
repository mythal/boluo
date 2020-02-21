import React, { useEffect, useState } from 'react';
import Prando from 'prando';
import { ExprNode } from '../entities';
import '../style.css';

interface Props {
  node: ExprNode;
  top?: true;
  rng?: Prando;
}

const fakeRng = new Prando();

export const ExprEntity: React.FC<Props> = ({ node, rng }) => {
  const [_, setCounter] = useState(0);
  useEffect(() => {
    let counter = 0;
    if (rng !== undefined || node.type !== 'Roll') {
      return;
    }
    const interval = window.setInterval(() => {
      setCounter(counter + 1);
      counter += 1;
    }, 500);
    return () => clearInterval(interval);
  }, []);
  const unsupported = <div className="inline text-gray-300">[不支持]</div>;
  if (node.type === 'Num') {
    return <div className="inline text-lg">{node.value}</div>;
  } else if (node.type === 'Roll') {
    if (node.counter > 64 || node.face > 65535) {
      return unsupported;
    }
    const result: number[] = [];
    let sum = 0;
    for (let i = 0; i < node.counter; i++) {
      const x = (rng ?? fakeRng).nextInt(1, node.face);
      sum += x;
      result.push(x);
    }
    return (
      <div className="inline-block" title={result.join(', ')}>
        {node.counter}D{node.face}={sum}
      </div>
    );
  } else if (node.type === 'Binary') {
    return (
      <div className="inline-block">
        <ExprEntity node={node.l} rng={rng} /> {node.op} <ExprEntity node={node.r} rng={rng} />
      </div>
    );
  } else {
    return unsupported;
  }
};
