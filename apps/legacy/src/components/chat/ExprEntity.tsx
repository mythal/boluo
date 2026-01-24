import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { darken } from 'polished';
import Prando from 'prando';
import React, { type MouseEventHandler, type ReactNode, useState } from 'react';
import Cubes from '../../assets/icons/cubes.svg';
import D20 from '../../assets/icons/d20.svg';
import ElderSign from '../../assets/icons/elder-sign.svg';
import ThumbDown from '../../assets/icons/thumb-down.svg';
import ThumbUp from '../../assets/icons/thumb-up.svg';
import {
  type CocRollResult,
  type DicePoolResult,
  type EvaluatedExprNode,
  type ExprNode,
  type FateResult,
  type RepeatResult,
  type RollResult,
} from '../../interpreter/entities';
import {
  cocRollSubTypeDisplay,
  cocSuccessLevelDisplay,
  evaluate,
  MAX_DICE_COUNTER,
  TOO_MUCH_LAYER,
} from '../../interpreter/eval';
import { useSelector } from '../../store';
import {
  fontMono,
  fontNormal,
  mL,
  mY,
  pX,
  pY,
  roundedPx,
  textLg,
  textSm,
} from '../../styles/atoms';
import { blue, red, textColor } from '../../styles/colors';
import Icon from '../atoms/Icon';

interface Props {
  node: ExprNode;
  top?: true;
  rng?: Prando;
}

const fakeRng = new Prando();

const Num: React.FC<{ children: ReactNode }> = ({ children }) => {
  if (!Number.isSafeInteger(children)) {
    children = '?';
  }
  return <span css={textLg}>{children}</span>;
};

const entityShadow = css`
  box-shadow: 0 0 3px 0 rgba(0, 0, 0, 50%);
`;

const error = css`
  ${[pX(1), pY(0.5), roundedPx, entityShadow]};
  background-color: ${red['900']};
`;

const Unsupported = () => <span css={error}>不支持</span>;

const Roll = styled.span`
  ${[pX(1), pY(0.75), mY(0.25), textSm, roundedPx, entityShadow, fontNormal]};
  cursor: pointer;
  align-items: center;
  justify-content: center;
  background-color: ${darken(0.7, textColor)};
  box-decoration-break: clone;

  &:hover {
    background-color: ${darken(0.65, textColor)};
    border-color: ${darken(0.5, textColor)};
  }
`;

const fateDiceStyle = css`
  ${[fontMono, pX(1)]};
  vertical-align: center;
  background-color: ${blue['600']};
  box-shadow: 0 0 1px 0 #000;
  border-radius: 1px;
`;

const fateDiceMapper = (value: number, index: number): React.ReactNode => {
  if (value === 0) {
    return (
      <span key={index} css={fateDiceStyle}>
        {' '}
      </span>
    );
  } else if (value === 1) {
    return (
      <span key={index} css={fateDiceStyle}>
        +
      </span>
    );
  } else {
    return (
      <span key={index} css={fateDiceStyle}>
        -
      </span>
    );
  }
};

const DicePoolNode: React.FC<{ node: DicePoolResult }> = ({ node }) => {
  const defaultExpand = useSelector((state) => Boolean(state.profile?.settings.expandDice));
  const [expand, setExpand] = useState(defaultExpand);

  const handleMouse: MouseEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpand(!expand);
  };
  let additionCounter: React.ReactNode = null;
  if (node.fumble || node.critical) {
    const { fumble, critical } = node;
    let fumbleCount = 0;
    let criticalCount = 0;
    for (let i = 0; i < node.values.length; i++) {
      const v = node.values[i];
      if (fumble && v <= fumble) {
        fumbleCount++;
      }
      if (critical && v >= critical) {
        criticalCount++;
      }
    }
    additionCounter = (
      <span css={mL(1)}>
        (
        {fumble && (
          <React.Fragment>
            <Icon title="大失败" icon={ThumbDown} />
            {fumbleCount}
            {critical && ' '}
          </React.Fragment>
        )}
        {critical && (
          <React.Fragment>
            <Icon icon={ThumbUp} title="大成功" />
            {criticalCount}
          </React.Fragment>
        )}
        )
      </span>
    );
  }
  return (
    <Roll onClick={handleMouse} className="roll">
      <Icon icon={Cubes} />
      {node.counter}d{node.face}{' '}
      {expand && <React.Fragment>[{node.values.join(', ')}]</React.Fragment>} ≥ {node.min} ⇒{' '}
      {node.value}
      {additionCounter}
    </Roll>
  );
};

const FateRollNode: React.FC<{ node: FateResult }> = ({ node }) => {
  return (
    <Roll className="roll">
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
  const { value, targetValue } = node;
  const modifierName: React.ReactNode = cocRollSubTypeDisplay(node.subType);

  let successName: string | null;
  if (targetValue == null) {
    successName = null;
  } else {
    successName = cocSuccessLevelDisplay(value, targetValue);
  }

  return (
    <Roll onMouseDown={handleMouse} className="roll">
      <Icon icon={ElderSign} />
      {node.value}
      {expand && <span>= {node.rolled}</span>}
      {modifierName && <span css={[mL(1)]}>{modifierName}</span>}
      {expand && node.modifiers.length > 0 && (
        <span css={[mL(1)]}>[{node.modifiers.join(', ')}]</span>
      )}
      {successName && <span css={[mL(1)]}>{successName}</span>}
      {expand && targetValue != null && <span>({targetValue})</span>}
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
    return <span css={error}>骰子过多</span>;
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
    <Roll onMouseDown={handleMouse} className="roll">
      <Icon icon={D20} />
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

const Repeat: React.FC<{ node: RepeatResult }> = ({ node }) => {
  const len = node.evaluated.length;
  if (len === 0) {
    return null;
  }
  const first = node.evaluated[0];
  const nodeList: React.ReactNode[] = [
    <React.Fragment key={0}>
      <Node node={first} /> = <Num>{first.value}</Num>
    </React.Fragment>,
  ];
  for (let i = 1; i < node.evaluated.length; i++) {
    const n = node.evaluated[i];
    nodeList.push(
      <React.Fragment key={i}>
        , <Node key={i} node={n} /> = <Num>{n.value}</Num>
      </React.Fragment>,
    );
  }
  return <React.Fragment>{nodeList}</React.Fragment>;
};

const Node: React.FC<{ node: EvaluatedExprNode }> = ({ node }) => {
  if (node.type === 'Num') {
    return <Num>{node.value}</Num>;
  } else if (node.type === 'Roll') {
    return <RollNode node={node} />;
  } else if (node.type === 'CocRoll') {
    return <CocRollNode node={node} />;
  } else if (node.type === 'DicePool') {
    return <DicePoolNode node={node} />;
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
  } else if (node.type === 'Repeat') {
    return <Repeat node={node} />;
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
      return <span css={error}>表达式嵌套太深</span>;
    } else {
      throw e;
    }
  }
});
