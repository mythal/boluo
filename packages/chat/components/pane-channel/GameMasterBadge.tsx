import { FloatingPortal } from '@floating-ui/react';
import { Gamemaster } from 'icons';
import { FC } from 'react';
import React from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from 'ui/Icon';
import { useTooltip } from '../../hooks/useTooltip';

interface Props {}

export const GameMasterBadge: FC<Props> = React.memo(() => {
  const { showTooltip, refs, getFloatingProps, getReferenceProps, floatingStyles } = useTooltip();
  return (
    <>
      <span
        className="text-surface-500 bg-surface-200/50 rounded px-1"
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        <Icon icon={Gamemaster} className="" />
      </span>
      {showTooltip && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="bg-highest/75 text-lowest rounded px-2 py-1 text-sm shadow"
          >
            <FormattedMessage defaultMessage="Game Master" />
          </div>
        </FloatingPortal>
      )}
    </>
  );
});

GameMasterBadge.displayName = 'GameMasterBadge';
