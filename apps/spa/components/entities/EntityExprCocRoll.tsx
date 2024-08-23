import { Dice, FlexibleStar } from '@boluo/icons';
import { type FC, type ReactNode } from 'react';
import { useIntl } from 'react-intl';
import { type CocRoll, type CocRollResult } from '../../interpreter/entities';
import { cocRollSubTypeDisplay, cocSuccessLevelDisplay } from '../../interpreter/eval';
import { Delay } from '../Delay';
import { FallbackIcon } from '../FallbackIcon';
import { RollBox } from './RollBox';

interface Props {
  node: CocRoll | CocRollResult;
}

const UndecidedCocRoll: FC<{ node: CocRoll }> = ({ node }) => {
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

const CocResult: FC<{ node: CocRollResult }> = ({ node }) => {
  const intl = useIntl();
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
    successLevel = <span className="ml-1 font-bold">{cocSuccessLevelDisplay(intl, node.value, node.targetValue)}</span>;
  }
  return (
    <span>
      {modifiers}
      {node.value}
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
        <span className="mx-0.5 inline-block w-4 text-center">{cocRollSubTypeDisplay(node.subType)}</span>
      )}
      {'value' in node ? <CocResult node={node} /> : <UndecidedCocRoll node={node} />}
    </RollBox>
  );
};
