import { css } from '@emotion/react';
import * as React from 'react';
import { useCallback } from 'react';
import TheaterMasks from '../../../assets/icons/theater-masks.svg';
import { useChannelId } from '../../../hooks/useChannelId';
import { useDispatch, useSelector } from '../../../store';
import { relative, textXs } from '../../../styles/atoms';
import Tooltip from '../../atoms/Tooltip';
import ChatItemToolbarButton from '../ChatItemToolbarButton';

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
  const pane = useChannelId();
  const dispatch = useDispatch();
  const inGame = useSelector((state) => state.chatStates.get(pane)!.compose.inGame);
  const toggleInGame = useCallback(
    () => dispatch({ type: 'SET_IN_GAME', pane, inGame: 'TOGGLE' }),
    [dispatch, pane],
  );
  return (
    <div css={inGameContainer} className={className}>
      <Tooltip className="tooltip">
        <div>游戏内</div>
        <div css={[textXs]}>Esc</div>
      </Tooltip>
      <ChatItemToolbarButton on={inGame} onClick={toggleInGame} icon={TheaterMasks} size="large" />
    </div>
  );
}

export default React.memo(InGameButton);
