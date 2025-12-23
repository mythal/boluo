import Dice from '@boluo/icons/Dice';
import FlexibleStar from '@boluo/icons/FlexibleStar';
import { type FC, type ReactNode } from 'react';
import { type IntlShape, useIntl } from 'react-intl';
import {
  type CocRoll,
  type EvaluatedExprOf,
  type ExprOf,
  type MaybeEvalutedExprOf,
} from '@boluo/api';
import { Delay } from '../Delay';
import { FallbackIcon } from '../FallbackIcon';
import { RollBox } from './RollBox';
import { Result } from './Result';
import { useIsTopLevel } from './top-level';

export const cocRollSubTypeDisplay = (subType: CocRoll['subType']): string | null => {
  let modifierName: string | null = null;
  if (subType === 'BONUS') {
    modifierName = '↥';
  } else if (subType === 'BONUS_2') {
    modifierName = '⇈';
  } else if (subType === 'PENALTY') {
    modifierName = '↧';
  } else if (subType === 'PENALTY_2') {
    modifierName = '⇊';
  }
  return modifierName;
};

export const cocSuccessLevelDisplay = (
  intl: IntlShape,
  value: number,
  targetValue: number,
): string => {
  let successName: string;
  if (value === 100 || (targetValue < 50 && value > 95)) {
    successName = intl.formatMessage({ defaultMessage: 'Fumble' });
  } else if (value === 1) {
    successName = intl.formatMessage({ defaultMessage: 'Critical' });
  } else if (value > targetValue) {
    successName = intl.formatMessage({ defaultMessage: 'Failure' });
  } else if (value <= Math.floor(targetValue / 5)) {
    successName = '⅕ ' + intl.formatMessage({ defaultMessage: 'Extreme Success' });
  } else if (value <= targetValue >> 1) {
    successName = '½ ' + intl.formatMessage({ defaultMessage: 'Hard Success' });
  } else {
    successName = intl.formatMessage({ defaultMessage: 'Success' });
  }
  return successName;
};

interface Props {
  node: MaybeEvalutedExprOf<'CocRoll'>;
}

const UndecidedCocRoll: FC<{ node: ExprOf<'CocRoll'> }> = ({ node }) => {
  let target: ReactNode = null;
  if (node.target && node.target.type === 'Num') {
    target = <span className="text-text-muted ml-0.5">≤{node.target.value}</span>;
  }
  return (
    <span>
      <span className="mx-0.5">??</span>
      {target}
    </span>
  );
};

const CocResult: FC<{ node: EvaluatedExprOf<'CocRoll'> }> = ({ node }) => {
  const intl = useIntl();
  const topLevel = useIsTopLevel();
  let target: ReactNode = null;
  let successLevel: ReactNode = null;
  let modifiers: ReactNode = null;
  if (node.modifiers.length > 0) {
    modifiers = (
      <span className="text-text-muted mx-0.5 text-sm">
        (
        <Delay fallback={<FallbackIcon />}>
          <Dice className="inline h-4 w-4" />
        </Delay>
        <span className="mr-1">{node.rolled}</span>
        {cocRollSubTypeDisplay(node.subType)}
        {node.modifiers.join(',')})
      </span>
    );
  }
  if (node.targetValue) {
    target = (
      <span className="text-text-muted mx-0.5">
        {node.value <= node.targetValue ? '≤' : '>'}
        {node.targetValue}
      </span>
    );
    successLevel = (
      <span className="ml-1 font-bold">
        {cocSuccessLevelDisplay(intl, node.value, node.targetValue)}
      </span>
    );
  }
  return (
    <span>
      {modifiers}
      <Result final={topLevel} noEqual>
        {node.value}
      </Result>
      {target}
      {successLevel}
    </span>
  );
};

export const EntityExprCocRoll: FC<Props> = ({ node }) => {
  return (
    <RollBox>
      <Delay fallback={<FallbackIcon />}>
        <FlexibleStar className="mr-0.5 inline h-4 w-4" />
      </Delay>

      {node.subType !== 'NORMAL' && (
        <span className="mx-0.5 inline-block w-4 text-center">
          {cocRollSubTypeDisplay(node.subType)}
        </span>
      )}
      {'value' in node ? <CocResult node={node} /> : <UndecidedCocRoll node={node} />}
    </RollBox>
  );
};
