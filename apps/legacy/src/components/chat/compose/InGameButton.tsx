import * as React from 'react';
import { useCallback } from 'react';
import TheaterMasks from '@boluo/icons/legacy/TheaterMasks';
import { useChannelId } from '../../../hooks/useChannelId';
import { useDispatch, useSelector } from '../../../store';
import ChatItemToolbarButton from '../ChatItemToolbarButton';

interface Props {
  className?: string;
}

function InGameButton({ className }: Props) {
  const pane = useChannelId();
  const dispatch = useDispatch();
  const inGame = useSelector((state) => state.chatStates.get(pane)!.compose.inGame);
  const toggleInGame = useCallback(
    () => dispatch({ type: 'SET_IN_GAME', pane, inGame: 'TOGGLE' }),
    [dispatch, pane],
  );
  return (
    <ChatItemToolbarButton
      className={className}
      on={inGame}
      onClick={toggleInGame}
      icon={TheaterMasks}
      size="large"
      title="游戏内"
      info="Esc"
    />
  );
}

export default React.memo(InGameButton);
