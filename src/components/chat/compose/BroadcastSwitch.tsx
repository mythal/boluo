import * as React from 'react';
import broadcastTower from '../../../assets/icons/broadcast-tower.svg';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import { broadcastAtom } from './state';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useChannelId } from '../../../hooks/useChannelId';

interface Props {
  size?: 'normal' | 'large';
  className?: string;
}

function BroadcastSwitch({ className, size }: Props) {
  const [broadcast, update] = useAtom(broadcastAtom, useChannelId());
  const toggleBroadcast = useCallback(() => {
    update((isBroadcast) => !isBroadcast);
  }, [update]);
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
