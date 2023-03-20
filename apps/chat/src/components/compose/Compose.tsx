'use client';
import type { GetMe } from 'api';
import { useCallback, useRef } from 'react';
import { AddDiceButton } from './AddDiceButton';
import { ComposeTextArea } from './ComposeTextArea';
import { InGameSwitchButton } from './InGameSwitchButton';
import { SendButton, SendRef } from './SendButton';

interface Props {
  me: GetMe;
  className?: string;
}

export const Compose = ({ me, className }: Props) => {
  const sendRef = useRef<SendRef | null>(null);
  const send = useCallback(() => sendRef.current?.send(), []);
  return (
    <div className={className}>
      <div className="flex flex-col gap-2">
        <div className="flex gap-1">
          <InGameSwitchButton />
          <AddDiceButton />
          <div className="flex-grow text-right">
            <SendButton me={me} ref={sendRef} />
          </div>
        </div>
        <ComposeTextArea send={send} />
      </div>
    </div>
  );
};
