import React, { MouseEventHandler, useState } from 'react';
import Prando from 'prando';
import { EvaluatedExprNode, ExprNode, RollResult } from '@/interpreter/entities';
import D20Icon from '../../assets/icons/d20.svg';
import { evaluate, TOO_MUCH_LAYER } from '@/interpreter/eval';
import Icon from '@/components/atoms/Icon';
import { inlineBlock, minorTextColor, pX, pY, roundedPx, textColor, textLg, textSm } from '@/styles/atoms';
import styled from '@emotion/styled';
import { darken } from 'polished';

interface Props {
  node: ExprNode;
  top?: true;
  rng?: Prando;
}

const fakeRng = new Prando();

const Num = styled.span`
  ${textLg};
`;

const Unsupported = () => <span css={{ color: minorTextColor }}>[不支持]</span>;

const Roll = styled.span`
  ${[pX(1), pY(0.5), inlineBlock, roundedPx]};
  cursor: pointer;
  background-color: ${darken(0.7, textColor)};
  border: 1px solid ${darken(0.6, textColor)};

  &:hover {
    background-color: ${darken(0.65, textColor)};
    border-color: ${darken(0.5, textColor)};
  }
`;

const RollNode: React.FC<{ node: RollResult }> = ({ node }) => {
  const [expand, setExpand] = useState(false);

  const handleMouse: MouseEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpand(!expand);
  };

  const resultList = node.values.length > 1 ? <span>=[{node.values.join(', ')}]</span> : null;

  return (
    <Roll onMouseDown={handleMouse}>
      <Icon sprite={D20Icon} />
      {node.counter}D{node.face}
      {expand && (
        <React.Fragment>
          {resultList}={node.value}
        </React.Fragment>
      )}
    </Roll>
  );
};

const Node: React.FC<{ node: EvaluatedExprNode }> = ({ node }) => {
  if (node.type === 'Num') {
    return <Num>{node.value}</Num>;
  } else if (node.type === 'Roll') {
    return <RollNode node={node} />;
  } else if (node.type === 'Binary') {
    return (
      <React.Fragment>
        <Node node={node.l} /> {node.op} <Node node={node.r} />
      </React.Fragment>
    );
  } else if (node.type === 'Max') {
    return (
      <React.Fragment>
        max(
        <RollNode node={node.node} />
        )={node.value}
      </React.Fragment>
    );
  } else if (node.type === 'Min') {
    return (
      <React.Fragment>
        min(
        <RollNode node={node.node} />
        )={node.value}
      </React.Fragment>
    );
  } else if (node.type === 'SubExpr') {
    return <React.Fragment>({<Node node={node.node} />})</React.Fragment>;
  }

  return <Unsupported />;
};

export const ExprEntity = React.memo<Props>(({ node, rng }) => {
  try {
    const evaluated = evaluate(node, rng ?? fakeRng);
    return (
      <React.Fragment>
        <Node node={evaluated} />
        {rng ? (
          <span>
            {' '}
            = <Num>{evaluated.value}</Num>
          </span>
        ) : (
          <span css={[textSm]}>(预览)</span>
        )}
      </React.Fragment>
    );
  } catch (e) {
    if (e === TOO_MUCH_LAYER) {
      return <React.Fragment>表达式嵌套太深</React.Fragment>;
    } else {
      throw e;
    }
  }
});
