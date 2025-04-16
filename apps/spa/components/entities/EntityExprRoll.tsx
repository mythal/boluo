import { ArrowDownWideShort, ArrowUpWideShort, Dice } from '@boluo/icons';
import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import type { ExprOf, EvaluatedExprOf, MaybeEvalutedExprOf } from '@boluo/api';
import { Delay } from '../Delay';
import { FallbackIcon } from '@boluo/ui/FallbackIcon';
import { RollBox } from './RollBox';
import { useIsTopLevel } from '../../hooks/useIsTopLevel';
import { Result } from './Result';

interface Props {
  node: MaybeEvalutedExprOf<'Roll'>;
}

const RollFilter: FC<{ filter: ExprOf<'Roll'>['filter'] | undefined | null }> = ({ filter }) => {
  if (filter == null) return null;
  const [type, mount] = filter;
  return (
    <span className="text-surface-500 mx-0.5 text-sm">
      (
      <FormattedMessage defaultMessage="take" />{' '}
      <Delay fallback={<FallbackIcon />}>
        {type === 'HIGH' && <ArrowUpWideShort className="inline-block h-[1em] w-[1em]" />}
        {type === 'LOW' && <ArrowDownWideShort className="inline-block h-[1em] w-[1em]" />}
      </Delay>{' '}
      {mount})
    </span>
  );
};

const Undecided: FC = () => <span>=??</span>;

const ShowRollResult: FC<{ node: EvaluatedExprOf<'Roll'> }> = ({ node }) => {
  const topLevel = useIsTopLevel();
  if (node.values.length <= 1) {
    return <Result final={topLevel}>{node.value}</Result>;
  }
  return (
    <span>
      =<span className="text-text-lighter">[{node.values.join(', ')}]</span>
      <Result final={topLevel}>{node.value}</Result>
    </span>
  );
};

export const EntityExprRoll: FC<Props> = ({ node }) => {
  return (
    <RollBox>
      <span className="mr-0.5">
        <Delay fallback={<FallbackIcon />}>
          <Dice className="inline-block h-[1em] w-[1em]" />
        </Delay>
      </span>
      <RollFilter filter={node.filter} />
      <span className="mx-0.5">
        {node.counter}d{node.face}
      </span>
      {'value' in node ? <ShowRollResult node={node} /> : <Undecided />}
    </RollBox>
  );
};
