import { Dice, FlexibleStar } from '@boluo/icons';
import { type FC, type ReactNode } from 'react';
import { useIntl } from 'react-intl';
import { EvaluatedExprOf, ExprOf, MaybeEvalutedExprOf } from '@boluo/api';
import { cocRollSubTypeDisplay, cocSuccessLevelDisplay } from '../../interpreter/eval';
import { Delay } from '../Delay';
import { FallbackIcon } from '@boluo/ui/FallbackIcon';
import { RollBox } from './RollBox';
import { Result } from './Result';
import { useIsTopLevel } from '../../hooks/useIsTopLevel';

interface Props {
  node: MaybeEvalutedExprOf<'CocRoll'>;
}

const UndecidedCocRoll: FC<{ node: ExprOf<'CocRoll'> }> = ({ node }) => {
  let target: ReactNode = null;
  if (node.target && node.target.type === 'Num') {
    target = <span className="text-surface-500 ml-0.5">≤{node.target.value}</span>;
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
      <span className="text-surface-500 mx-0.5 text-sm">
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
      <span className="text-surface-500 mx-0.5">
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
