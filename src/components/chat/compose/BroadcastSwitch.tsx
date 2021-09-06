import * as React from 'react';
import broadcastTower from '../../../assets/icons/broadcast-tower.svg';
import ChatItemToolbarButton from '../ChatItemToolbarButton';
import { ComposeDispatch } from './reducer';
import { broadcastAtom } from './state';
import { useCallback } from 'react';
import { useAtom } from 'jotai';

interface Props {
  composeDispatch: ComposeDispatch;
  size?: 'normal' | 'large';
  className?: string;
}

function BroadcastSwitch({ className, size }: Props) {
  const [broadcast, update] = useAtom(broadcastAtom);
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
