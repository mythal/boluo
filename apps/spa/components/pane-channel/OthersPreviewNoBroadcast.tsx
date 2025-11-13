import React, { useRef, useState } from 'react';
import { BroadcastTurnedOff } from '@boluo/ui/chat/BroadcastTurnedOff';

interface Props {
  timestamp: number;
}

export const OthersPreviewNoBroadcast = React.memo<Props>(({ timestamp }: Props) => {
  const prevTimestamp = useRef(timestamp);
  const [count, setCount] = useState(0);
  if (timestamp !== prevTimestamp.current) {
    prevTimestamp.current = timestamp;
    setCount((x) => x + 1);
  }
  return <BroadcastTurnedOff count={count} />;
});

OthersPreviewNoBroadcast.displayName = 'OthersPreviewNoBroadcast';
