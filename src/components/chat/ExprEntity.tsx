import React, { useEffect, useState } from 'react';
import Prando from 'prando';
import { Binary, ExprNode, Roll } from '../../entities';
import { D20Icon } from '../icons';

interface Props {
  node: ExprNode;
  top?: true;
  rng?: Prando;
}

const fakeRng = new Prando();

const rollTheDice = (node: Roll, rng: Prando): number[] | null => {
  if (node.counter > 64 || node.face > 65535) {
    return null;
  }
  const result: number[] = [];
  if (node.face === 1) {
    return [node.counter];
  } else {
    for (let i = 0; i < node.counter; i++) {
      const x = (rng ?? fakeRng).nextInt(1, node.face);
      result.push(x);
    }
  }
  return result;
};

export const ExprEntity: React.FC<Props> = ({ node, rng }) => {
  const [_, setCounter] = useState(0);
  useEffect(() => {
    let counter = 0;
    if (rng !== undefined || node.type !== 'Roll' || node.face === 1) {
      return;
    }
    const interval = window.setInterval(() => {
      setCounter(counter + 1);
      counter += 1;
    }, 500);
    return () => clearInterval(interval);
  }, [rng]);

  const unsupported = <div className="inline text-gray-300">[不支持]</div>;
  if (node.type === 'Num') {
    return <div className="inline text-lg">{node.value}</div>;
  } else if (node.type === 'Roll') {
    const result = rollTheDice(node, rng ?? fakeRng);
    if (result === null) {
      return unsupported;
    }
    const sum = result.reduce((a, b) => a + b);
    return (
      <span className="inline-block" title={result.length > 1 ? result.join(', ') : undefined}>
        <D20Icon className="mr-1 opacity-50" />
        {node.counter}D{node.face}={sum}
      </span>
    );
  } else if (node.type === 'Binary') {
    return (
      <span className="inline-block cursor-pointer">
        <ExprEntity node={node.l} rng={rng} /> {node.op} <ExprEntity node={node.r} rng={rng} />
      </span>
    );
  } else {
    return unsupported;
  }
};
