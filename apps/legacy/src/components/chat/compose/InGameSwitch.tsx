import * as React from 'react';
import { useCallback } from 'react';
import TheaterMasks from '../../../assets/icons/theater-masks.svg';
import { useChannelId } from '../../../hooks/useChannelId';
import { useDispatch, useSelector } from '../../../store';
import ChatItemToolbarButton from '../ChatItemToolbarButton';

interface Props {
  className?: string;
  size?: 'normal' | 'large';
}

function InGameSwitch({ className, size }: Props) {
  const channelId = useChannelId();
  const dispatch = useDispatch();
  const inGame = useSelector((state) => state.chatStates.get(channelId)!.compose.inGame);
  const toggleInGame = useCallback(
    () => dispatch({ type: 'SET_IN_GAME', pane: channelId, inGame: 'TOGGLE' }),
    [channelId, dispatch],
  );
  return (
    <ChatItemToolbarButton
      on={inGame}
      className={className}
      onClick={toggleInGame}
      icon={TheaterMasks}
      title="游戏内"
      size={size}
      info="Esc"
    />
  );
}

export default React.memo(InGameSwitch);
