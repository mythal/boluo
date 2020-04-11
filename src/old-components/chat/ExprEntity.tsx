import React, { MouseEventHandler, useState } from 'react';
import Prando from 'prando';
import { EvaluatedExprNode, ExprNode, RollResult } from '../../interpreter/entities';
import { D20Icon } from '../icons';
import { evaluate, TOO_MUCH_LAYER } from '../../interpreter/eval';

interface Props {
  node: ExprNode;
  top?: true;
  rng?: Prando;
}

const fakeRng = new Prando();

const Unsupported = () => <span className="inline text-gray-300">[不支持]</span>;

const RollNode: React.FC<{ node: RollResult }> = ({ node }) => {
  const [expand, setExpand] = useState(false);

  const handleMouse: MouseEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpand(!expand);
  };

  const resultList = node.values.length > 1 ? <span>=[{node.values.join(', ')}]</span> : null;

  return (
    <span className="group inline-block border-dashed border-b-2 border-gray-500 cursor-pointer" onClick={handleMouse}>
      <D20Icon className="mr-1 opacity-50" />
      {node.counter}D{node.face}
      {expand && (
        <>
          {resultList}={node.value}
        </>
      )}
    </span>
  );
};

const Node: React.FC<{ node: EvaluatedExprNode }> = ({ node }) => {
  if (node.type === 'Num') {
    return <div className="inline text-lg">{node.value}</div>;
  } else if (node.type === 'Roll') {
    return <RollNode node={node} />;
  } else if (node.type === 'Binary') {
    return (
      <span>
        <Node node={node.l} /> {node.op} <Node node={node.r} />
      </span>
    );
  } else if (node.type === 'Max') {
    return (
      <span>
        max(
        <RollNode node={node.node} />
        )={node.value}
      </span>
    );
  } else if (node.type === 'Min') {
    return (
      <span>
        min(
        <RollNode node={node.node} />
        )={node.value}
      </span>
    );
  } else if (node.type === 'SubExpr') {
    return <span>({<Node node={node.node} />})</span>;
  }

  return <Unsupported />;
};

export const ExprEntity = React.memo<Props>(({ node, rng }) => {
  try {
    const evaluated = evaluate(node, rng ?? fakeRng);
    return (
      <span>
        <Node node={evaluated} />
        {rng ? <span className="px-1">={evaluated.value}</span> : <span className="text-xs">(预览)</span>}
      </span>
    );
  } catch (e) {
    if (e === TOO_MUCH_LAYER) {
      return <span>表达式嵌套太深</span>;
    } else {
      throw e;
    }
  }
});
