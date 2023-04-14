'use client';
import type { GetMe } from 'api';
import { AddDiceButton } from './AddDiceButton';
import { ComposeTextArea } from './ComposeTextArea';
import { InGameSwitchButton } from './InGameSwitchButton';
import { SendButton } from './SendButton';

interface Props {
  me: GetMe;
  className?: string;
}

export const Compose = ({ me, className }: Props) => {
  return (
    <div className={className}>
      <div className="flex flex-col gap-2">
        <div className="flex gap-1">
          <InGameSwitchButton />
          <AddDiceButton />
          <div className="flex-grow text-right">
            <SendButton me={me} />
          </div>
        </div>
        <ComposeTextArea me={me} />
      </div>
    </div>
  );
};
