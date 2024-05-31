import { Cubes, ThumbsDown, ThumbsUp } from '@boluo/icons';
import { type FC, type ReactNode } from 'react';
import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { type DicePool, type DicePoolResult } from '../../interpreter/entities';
import { Delay } from '../Delay';
import { FallbackIcon } from '../FallbackIcon';
import { RollBox } from './RollBox';

interface Props {
  node: DicePool | DicePoolResult;
}

interface SingleDiceProps {
  value: number;
  last?: boolean;
  addition: number;
  critical?: number;
  fumble?: number;
}

export const SingleDice: FC<SingleDiceProps> = React.memo(({ value, last = false, fumble, critical }) => {
  const intl = useIntl();
  let special: ReactNode = null;
  if (fumble && value <= fumble) {
    const title = intl.formatMessage({ defaultMessage: 'Fumble' });
    special = <ThumbsUp className="inline text-sm" aria-label={title} />;
  } else if (critical && value >= critical) {
    const title = intl.formatMessage({ defaultMessage: 'Critical' });
    special = <ThumbsDown className="inline text-sm" aria-label={title} />;
  }

  return (
    <>
      <span>{value}</span>
      <span className="text-surface-700 text-xs">{special}</span>
      {!last && ', '}
    </>
  );
});

SingleDice.displayName = 'SingleDice';

export const EntityExprDicePoolRoll: FC<Props> = React.memo(({ node }) => {
  return (
    <RollBox>
      <Delay fallback={<FallbackIcon />}>
        <Cubes className="inline" />
      </Delay>
      <span className="decoration-surface-600 group/dice-pool relative cursor-help px-1 underline decoration-dotted">
        <FormattedMessage defaultMessage="Dice Pool" />
        <span className="bg-highest/75 text-lowest absolute bottom-full left-0  hidden w-max rounded-sm px-2 py-1 text-sm shadow group-hover/dice-pool:inline-block">
          <FormattedMessage
            defaultMessage="Critical: {critical}, Fumble: {fumble}, Success: {success}, Add: {addition}"
            values={{
              critical: node.critical ?? 'N/A',
              fumble: node.fumble ?? 'N/A',
              success: node.min,
              addition: node.addition,
            }}
          />
        </span>
      </span>

      <span>
        {node.counter}d{node.face}
      </span>
      <span>=</span>
      {'values' in node ? (
        <span className="text-surface-500">
          [
          {node.values.map((value, index) => (
            <SingleDice
              key={index}
              value={value}
              last={index === node.values.length - 1}
              addition={node.addition}
              critical={node.critical}
              fumble={node.fumble}
            />
          ))}
          ]
        </span>
      ) : (
        <span className="italic">???</span>
      )}
      {'value' in node && <span className="pl-1">={node.value}</span>}
    </RollBox>
  );
});

EntityExprDicePoolRoll.displayName = 'EntityExprDicePoolRoll';
