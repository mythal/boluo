import * as React from 'react';
import { useCallback } from 'react';
import BroadcastTower from '../../../assets/icons/broadcast-tower.svg';
import { useChannelId } from '../../../hooks/useChannelId';
import { useDispatch, useSelector } from '../../../store';
import ChatItemToolbarButton from '../ChatItemToolbarButton';

interface Props {
  size?: 'normal' | 'large';
  className?: string;
}

function BroadcastSwitch({ className, size }: Props) {
  const pane = useChannelId();
  const broadcast = useSelector((state) => state.chatStates.get(pane)!.compose.broadcast);
  const dispatch = useDispatch();
  const toggleBroadcast = useCallback(() => {
    dispatch({ type: 'SET_BROADCAST', pane, broadcast: 'TOGGLE' });
  }, [dispatch, pane]);
  return (
    <ChatItemToolbarButton
      icon={BroadcastTower}
      className={className}
      on={broadcast}
      size={size}
      onClick={toggleBroadcast}
      title="输入中广播"
    />
  );
}

export default React.memo(BroadcastSwitch);
