import Cubes from '@boluo/icons/Cubes';
import ThumbsDown from '@boluo/icons/ThumbsDown';
import ThumbsUp from '@boluo/icons/ThumbsUp';
import { type FC, type ReactNode } from 'react';
import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { type MaybeEvalutedExprOf } from '@boluo/api';
import { Delay } from '../Delay';
import { FallbackIcon } from '@boluo/ui/FallbackIcon';
import { RollBox } from './RollBox';
import { Result } from './Result';
import { useIsTopLevel } from './top-level';

interface Props {
  node: MaybeEvalutedExprOf<'DicePool'>;
}

interface SingleDiceProps {
  value: number;
  last?: boolean | null;
  addition: number;
  critical?: number | null;
  fumble?: number | null;
}

export const SingleDice: FC<SingleDiceProps> = React.memo(
  ({ value, last = false, fumble, critical }: SingleDiceProps) => {
    const intl = useIntl();
    let special: ReactNode = null;
    if (fumble && value <= fumble) {
      const title = intl.formatMessage({ defaultMessage: 'Fumble' });
      special = <ThumbsDown className="inline text-sm" aria-label={title} />;
    } else if (critical && value >= critical) {
      const title = intl.formatMessage({ defaultMessage: 'Critical' });
      special = <ThumbsUp className="inline text-sm" aria-label={title} />;
    }

    return (
      <span>
        <span>{value}</span>
        <span className="text-text-secondary text-xs">{special}</span>
        {!last && ', '}
      </span>
    );
  },
);

SingleDice.displayName = 'SingleDice';

export const EntityExprDicePoolRoll: FC<Props> = React.memo(({ node }: Props) => {
  const topLevel = useIsTopLevel();
  return (
    <RollBox>
      <Delay fallback={<FallbackIcon />}>
        <Cubes className="inline" />
      </Delay>
      <span className="decoration-text-secondary group/dice-pool relative cursor-help px-1 underline decoration-dotted">
        <FormattedMessage defaultMessage="Dice Pool" />
        <span className="bg-tooltip-bg text-tooltip-text absolute bottom-full left-0 hidden w-max rounded-sm px-2 py-1 text-sm shadow group-hover/dice-pool:inline-block">
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
        <span className="text-text-muted">
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
      {'value' in node && (
        <span className="pl-1">
          <Result final={topLevel}>{node.value}</Result>
        </span>
      )}
    </RollBox>
  );
});

EntityExprDicePoolRoll.displayName = 'EntityExprDicePoolRoll';
