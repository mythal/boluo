import { Gamemaster } from '@boluo/icons';
import { type FC } from 'react';
import React from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from '@boluo/ui/Icon';
import { useTooltip } from '../../hooks/useTooltip';
import { TooltipBox } from '@boluo/ui/TooltipBox';

export const GameMasterBadge: FC = React.memo(() => {
  const { showTooltip, refs, getFloatingProps, getReferenceProps, floatingStyles } = useTooltip();
  return (
    <div className="inline-block h-6" ref={refs.setReference} {...getReferenceProps()}>
      <span className="text-surface-500 bg-surface-200/50 rounded px-1">
        <Icon icon={Gamemaster} className="" />
      </span>
      <TooltipBox
        show={showTooltip}
        ref={refs.setFloating}
        style={floatingStyles}
        {...getFloatingProps()}
        defaultStyle
      >
        <FormattedMessage defaultMessage="Game Master" />
      </TooltipBox>
    </div>
  );
});

GameMasterBadge.displayName = 'GameMasterBadge';
