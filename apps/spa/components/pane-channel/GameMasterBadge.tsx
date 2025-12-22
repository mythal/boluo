import Gamemaster from '@boluo/icons/Gamemaster';
import { type FC } from 'react';
import React from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from '@boluo/ui/Icon';
import { useTooltip } from '@boluo/ui/hooks/useTooltip';
import { TooltipBox } from '@boluo/ui/TooltipBox';

export const GameMasterBadge: FC = React.memo(() => {
  const { showTooltip, refs, getFloatingProps, getReferenceProps, floatingStyles } = useTooltip();
  return (
    <div
      className="GameMasterBadge inline-block h-6"
      ref={refs.setReference}
      {...getReferenceProps()}
    >
      <span className="text-text-muted bg-surface-muted/50 rounded px-1">
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
