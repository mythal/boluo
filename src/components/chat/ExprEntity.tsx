import React, { MouseEventHandler, useState } from 'react';
import Prando from 'prando';
import { CocRollResult, EvaluatedExprNode, ExprNode, FateResult, RollResult } from '../../interpreter/entities';
import D20Icon from '../../assets/icons/d20.svg';
import elderSign from '../../assets/icons/elder-sign.svg';
import { evaluate, MAX_DICE_COUNTER, TOO_MUCH_LAYER } from '../../interpreter/eval';
import Icon from '../atoms/Icon';
import { fontMono, fontNormal, mL, mX, mY, pX, roundedPx, textLg, textSm } from '../../styles/atoms';
import styled from '@emotion/styled';
import { darken } from 'polished';
import { blue, minorTextColor, textColor } from '../../styles/colors';
import { useSelector } from '../../store';
import { css } from '@emotion/core';

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
  ${[pX(1), mX(1), mY(0.25), textSm, roundedPx, fontNormal]};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: ${darken(0.7, textColor)};
  border: 1px solid ${darken(0.6, textColor)};

  &:hover {
    background-color: ${darken(0.65, textColor)};
    border-color: ${darken(0.5, textColor)};
  }
`;

const fateDiceStyle = css`
  ${[fontMono, mX(0.5), mY(0.5)]};
  display: inline-flex;
  width: 1rem;
  height: 1rem;
  align-items: center;
  justify-content: center;
  background-color: ${blue['600']};
  box-shadow: 0 0 1px 0 #000;
  border-radius: 1px;
`;

const fateDiceMapper = (value: number): React.ReactNode => {
  if (value === 0) {
    return <span css={fateDiceStyle}> </span>;
  } else if (value === 1) {
    return <span css={fateDiceStyle}>+</span>;
  } else {
    return <span css={fateDiceStyle}>-</span>;
  }
};

const FateRollNode: React.FC<{ node: FateResult }> = ({ node }) => {
  return (
    <Roll>
      {node.values.map(fateDiceMapper)}
      <span css={mL(1)}>{node.value}</span>
    </Roll>
  );
};

const CocRollNode: React.FC<{ node: CocRollResult }> = ({ node }) => {
  const defaultExpand = useSelector((state) => Boolean(state.profile?.settings.expandDice));
  const [expand, setExpand] = useState(defaultExpand);

  const handleMouse: MouseEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpand(!expand);
  };
  const { value, subType, targetValue } = node;
  let modifierName: React.ReactNode = null;
  if (subType === 'BONUS') {
    modifierName = '奖';
  } else if (subType === 'BONUS_2') {
    modifierName = '奖²';
  } else if (subType === 'PENALTY') {
    modifierName = '罚';
  } else if (subType === 'PENALTY_2') {
    modifierName = '罚²';
  }

  let successName: string | null = null;
  if (targetValue === undefined) {
    successName = null;
  } else if (value === 100 || (targetValue < 50 && value > 95)) {
    successName = '大失败';
  } else if (value === 1) {
    successName = '大成功';
  } else if (value >= targetValue) {
    successName = '失败';
  } else if (value < targetValue / 5) {
    successName = '极难成功';
  } else if (value < targetValue << 1) {
    successName = '困难成功';
  } else if (value < targetValue) {
    successName = '成功';
  }

  return (
    <Roll onMouseDown={handleMouse}>
      <Icon sprite={elderSign} />
      {node.value}
      {expand && <span> = {node.rolled}</span>}
      {modifierName && <span css={[mL(1)]}>{modifierName}</span>}
      {expand && node.modifiers.length > 0 && <span css={[mL(1)]}>[{node.modifiers.join(', ')}]</span>}
      {successName && <span css={[mL(1)]}>{successName}</span>}
      {expand && node.targetValue && <span>({targetValue})</span>}
    </Roll>
  );
};

const RollNode: React.FC<{ node: RollResult }> = ({ node }) => {
  const defaultExpand = useSelector((state) => Boolean(state.profile?.settings.expandDice));
  const [expand, setExpand] = useState(defaultExpand);

  const handleMouse: MouseEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpand(!expand);
  };

  if (node.counter > MAX_DICE_COUNTER) {
    return <Roll>骰子过多</Roll>;
  }

  const resultList = node.values.length > 1 ? <span>=[{node.values.join(', ')}]</span> : null;
  let filteredList: React.ReactNode = null;
  if (node.filtered && node.filtered.length > 1) {
    filteredList = <span>=[{node.filtered.join(', ')}]</span>;
  }
  let filter: React.ReactNode = null;
  if (node.filter) {
    const [type, counter] = node.filter;
    filter = (
      <span>
        {' '}
        {type} {counter}
      </span>
    );
  }

  return (
    <Roll onMouseDown={handleMouse}>
      <Icon sprite={D20Icon} />
      {node.counter}D{node.face}
      {filter}
      {expand && (
        <React.Fragment>
          {resultList}
          {filteredList}
        </React.Fragment>
      )}
      ={node.value}
    </Roll>
  );
};

const Node: React.FC<{ node: EvaluatedExprNode }> = ({ node }) => {
  if (node.type === 'Num') {
    return <Num>{node.value}</Num>;
  } else if (node.type === 'Roll') {
    return <RollNode node={node} />;
  } else if (node.type === 'CocRoll') {
    return <CocRollNode node={node} />;
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
    return <React.Fragment>({<Node node={node.evaluatedNode} />})</React.Fragment>;
  } else if (node.type === 'FateRoll') {
    return <FateRollNode node={node} />;
  }

  return <Unsupported />;
};

export const ExprEntity = React.memo<Props>(({ node, rng }) => {
  try {
    const showEvaluated = node.type === 'SubExpr' || node.type === 'Binary';
    const evaluated = evaluate(node, rng ?? fakeRng);
    return (
      <React.Fragment>
        <Node node={evaluated} />
        {showEvaluated && (
          <span>
            {' '}
            = <Num>{evaluated.value}</Num>
          </span>
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
