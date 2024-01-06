import { ArrowDownWideShort, ArrowUpWideShort, Dice } from 'icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { Roll, RollResult } from '../../interpreter/entities';
import { Delay } from '../Delay';
import { FallbackIcon } from '../FallbackIcon';
import { RollBox } from './RollBox';

interface Props {
  node: Roll | RollResult;
}

const RollFilter: FC<{ filter: Roll['filter'] | undefined | null }> = ({ filter }) => {
  if (filter == null) return null;
  const [type, mount] = filter;
  return (
    <span className="mx-0.5 text-sm text-surface-500">
      (
      <FormattedMessage defaultMessage="take" />{' '}
      <Delay fallback={<FallbackIcon />}>
        {type === 'HIGH' && <ArrowUpWideShort className="inline-block w-[1em] h-[1em]" />}
        {type === 'LOW' && <ArrowDownWideShort className="inline-block w-[1em] h-[1em]" />}
      </Delay>{' '}
      {mount})
    </span>
  );
};

const Undecided: FC = () => <span>=??</span>;

const ShowRollResult: FC<{ node: RollResult }> = ({ node }) => {
  if (node.values.length <= 1) {
    return (
      <span className="">
        {'='}
        {node.value}
      </span>
    );
  }
  return (
    <>
      =<span className="text-surface-500">[{node.values.join(', ')}]</span>={node.value}
    </>
  );
};

export const EntityExprRoll: FC<Props> = ({ node }) => {
  let result: string = '=??';
  if ('value' in node) {
    result = '';
    if (node.values.length > 1) {
      result += `=[${node.values.join(', ')}]`;
    }
    result += `=${node.value}`;
  }

  return (
    <RollBox>
      <span className="mr-0.5">
        <Delay fallback={<FallbackIcon />}>
          <Dice className="inline-block w-[1em] h-[1em]" />
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
