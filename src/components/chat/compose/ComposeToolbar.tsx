import * as React from 'react';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import { flexRowReverse, mR } from '../../../styles/atoms';
import mask from '../../../assets/icons/theater-masks.svg';
import running from '../../../assets/icons/running.svg';
import broadcastTower from '../../../assets/icons/broadcast-tower.svg';
import styled from '@emotion/styled';
import { useCallback } from 'react';
import { useChannelId } from '../../../hooks/useChannelId';
import { useDispatch, useSelector } from '../../../store';

interface Props {}

const Toolbar = styled.div`
  ${[flexRowReverse]};
  grid-area: toolbar;
`;

function ComposeToolbar(props: Props) {
  const dispatch = useDispatch();
  const channelId = useChannelId();
  const pane = channelId;
  const isAction = useSelector((state) => state.chatStates.get(channelId)!.compose.isAction);
  const broadcast = useSelector((state) => state.chatStates.get(channelId)!.compose.broadcast);
  const inGame = useSelector((state) => state.chatStates.get(channelId)!.compose.inGame);
  const toggleIsAction = useCallback(() => dispatch({ type: 'SET_IS_ACTION', pane, isAction: 'TOGGLE' }), [
    dispatch,
    pane,
  ]);
  const toggleBroadcast = useCallback(() => dispatch({ type: 'SET_BROADCAST', pane, broadcast: 'TOGGLE' }), [
    dispatch,
    pane,
  ]);
  const toggleInGame = useCallback(() => dispatch({ type: 'SET_IN_GAME', pane, inGame: 'TOGGLE' }), [dispatch, pane]);
  return (
    <Toolbar>
      <ChatItemToolbarButton on={inGame} onClick={toggleInGame} sprite={mask} title="游戏内" info="Esc" />
      <ChatItemToolbarButton css={mR(1)} on={isAction} onClick={toggleIsAction} sprite={running} title="描述动作" />
      <ChatItemToolbarButton
        css={mR(1)}
        sprite={broadcastTower}
        on={broadcast}
        onClick={toggleBroadcast}
        title="输入中广播"
      />
    </Toolbar>
  );
}

export default React.memo(ComposeToolbar);
