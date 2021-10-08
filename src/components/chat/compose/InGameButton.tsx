import * as React from 'react';
import Tooltip from '../../atoms/Tooltip';
import { relative, textXs } from '../../../styles/atoms';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import mask from '../../../assets/icons/theater-masks.svg';
import { css } from '@emotion/core';
import { useAtom } from 'jotai';
import { inGameAtom } from './state';
import { useCallback } from 'react';
import { useChannelId } from '../../../hooks/useChannelId';

interface Props {
  className?: string;
}

const inGameContainer = css`
  ${[relative]};

  & .tooltip {
    visibility: hidden;
  }

  &:hover .tooltip {
    visibility: visible;
  }
`;

function InGameButton({ className }: Props) {
  const [inGame, setInGame] = useAtom(inGameAtom, useChannelId());
  const toggleInGame = useCallback(() => setInGame((inGame) => !inGame), [setInGame]);
  return (
    <div css={inGameContainer} className={className}>
      <Tooltip className="tooltip">
        <div>游戏内</div>
        <div css={[textXs]}>Esc</div>
      </Tooltip>
      <ChatItemToolbarButton on={inGame} onClick={toggleInGame} sprite={mask} size="large" />
    </div>
  );
}

export default React.memo(InGameButton);
