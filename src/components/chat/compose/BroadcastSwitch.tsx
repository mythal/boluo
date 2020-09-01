import * as React from 'react';
import broadcastTower from '../../../assets/icons/broadcast-tower.svg';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import { ComposeDispatch, update } from './reducer';

interface Props {
  broadcast: boolean;
  composeDispatch: ComposeDispatch;
  size?: 'normal' | 'large';
  className?: string;
}

function BroadcastSwitch({ broadcast, composeDispatch, className, size }: Props) {
  const toggleBroadcast = () => composeDispatch(update({ broadcast: !broadcast }));
  return (
    <ChatItemToolbarButton
      sprite={broadcastTower}
      className={className}
      on={broadcast}
      size={size}
      onClick={toggleBroadcast}
      title="输入中广播"
    />
  );
}

export default React.memo(BroadcastSwitch);
