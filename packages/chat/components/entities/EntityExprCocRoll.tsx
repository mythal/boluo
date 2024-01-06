import { Dice, FlexibleStar } from 'icons';
import { FC, ReactNode } from 'react';
import { useIntl } from 'react-intl';
import { CocRoll, CocRollResult } from '../../interpreter/entities';
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
    target = <span className="ml-0.5 text-surface-500">≤{node.target.value}</span>;
  }
  return (
    <>
      <span className="mx-0.5">??</span>
      {target}
    </>
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
          <Dice className="inline w-4 h-4" />
        </Delay>
        <span className="mr-1">{node.rolled}</span>
        {cocRollSubTypeDisplay(node.subType)}
        {node.modifiers.join(',')})
      </span>
    );
  }
  if (node.targetValue) {
    target = (
      <span className="mx-0.5 text-surface-500">
        {node.value <= node.targetValue ? '≤' : '>'}
        {node.targetValue}
      </span>
    );
    successLevel = <span className="ml-1 font-bold">{cocSuccessLevelDisplay(intl, node.value, node.targetValue)}</span>;
  }
  return (
    <>
      {modifiers}
      {node.value}
      {target}
      {successLevel}
    </>
  );
};

export const EntityExprCocRoll: FC<Props> = ({ node }) => {
  return (
    <RollBox>
      <Delay fallback={<FallbackIcon />}>
        <FlexibleStar className="inline w-4 h-4 mr-0.5" />
      </Delay>

      {node.subType !== 'NORMAL' && (
        <span className="w-4 mx-0.5 inline-block text-center">{cocRollSubTypeDisplay(node.subType)}</span>
      )}
      {'value' in node ? <CocResult node={node} /> : <UndecidedCocRoll node={node} />}
    </RollBox>
  );
};
