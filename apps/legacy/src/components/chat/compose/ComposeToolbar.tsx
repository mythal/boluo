import styled from '@emotion/styled';
import * as React from 'react';
import { useCallback } from 'react';
import BroadcastTower from '../../../assets/icons/broadcast-tower.svg';
import Running from '../../../assets/icons/running.svg';
import TheaterMasks from '../../../assets/icons/theater-masks.svg';
import { useChannelId } from '../../../hooks/useChannelId';
import { useDispatch, useSelector } from '../../../store';
import { flexRowReverse, mR } from '../../../styles/atoms';
import ChatItemToolbarButton from '../ChatItemToolbarButton';

const Toolbar = styled.div`
  ${[flexRowReverse]};
  grid-area: toolbar;
`;

function ComposeToolbar() {
  const dispatch = useDispatch();
  const channelId = useChannelId();
  const pane = channelId;
  const isAction = useSelector((state) => state.chatStates.get(channelId)!.compose.isAction);
  const broadcast = useSelector((state) => state.chatStates.get(channelId)!.compose.broadcast);
  const inGame = useSelector((state) => state.chatStates.get(channelId)!.compose.inGame);
  const toggleIsAction = useCallback(
    () => dispatch({ type: 'SET_IS_ACTION', pane, isAction: 'TOGGLE' }),
    [dispatch, pane],
  );
  const toggleBroadcast = useCallback(
    () => dispatch({ type: 'SET_BROADCAST', pane, broadcast: 'TOGGLE' }),
    [dispatch, pane],
  );
  const toggleInGame = useCallback(
    () => dispatch({ type: 'SET_IN_GAME', pane, inGame: 'TOGGLE' }),
    [dispatch, pane],
  );
  return (
    <Toolbar>
      <ChatItemToolbarButton
        on={inGame}
        onClick={toggleInGame}
        icon={TheaterMasks}
        title="游戏内"
        info="Esc"
      />
      <ChatItemToolbarButton
        css={mR(1)}
        on={isAction}
        onClick={toggleIsAction}
        icon={Running}
        title="描述动作"
      />
      <ChatItemToolbarButton
        css={mR(1)}
        icon={BroadcastTower}
        on={broadcast}
        onClick={toggleBroadcast}
        title="输入中广播"
      />
    </Toolbar>
  );
}

export default React.memo(ComposeToolbar);
