import * as React from 'react';
import broadcastTower from '../../../assets/icons/broadcast-tower.svg';
import ChatItemToolbarButton from '../../atoms/ChatItemToolbarButton';
import { ComposeDispatch, update } from './reducer';

interface Props {
  broadcast: boolean;
  composeDispatch: ComposeDispatch;
  className?: string;
}

function BroadcastSwitch({ broadcast, composeDispatch, className }: Props) {
  const toggleBroadcast = () => composeDispatch(update({ broadcast: !broadcast }));
  return (
    <ChatItemToolbarButton
      sprite={broadcastTower}
      className={className}
      on={broadcast}
      onClick={toggleBroadcast}
      title="输入中广播"
    />
  );
}

export default React.memo(BroadcastSwitch);
