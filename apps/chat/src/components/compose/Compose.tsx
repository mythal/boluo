'use client';
import type { GetMe } from 'api';
import { Ref } from 'react';
import { AddDiceButton } from './AddDiceButton';
import { ComposeTextArea } from './ComposeTextArea';
import { InGameSwitchButton } from './InGameSwitchButton';
import { SendButton, SendRef } from './SendButton';

interface Props {
  me: GetMe;
  className?: string;
  sendRef: Ref<SendRef>;
}

export const Compose = ({ me, className, sendRef }: Props) => {
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
        <ComposeTextArea />
      </div>
    </div>
  );
};
