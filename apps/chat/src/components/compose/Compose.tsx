'use client';
import type { GetMe } from 'api';
import { X } from 'icons';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useMemo } from 'react';
import { Button } from 'ui';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { AddDiceButton } from './AddDiceButton';
import { ComposeTextArea } from './ComposeTextArea';
import { InGameSwitchButton } from './InGameSwitchButton';
import { ResetComposeButton } from './ResetComposeButton';
import { SendButton } from './SendButton';

interface Props {
  me: GetMe;
  className?: string;
}

export const Compose = ({ me, className }: Props) => {
  const composeAtom = useComposeAtom();
  const editMode = useAtomValue(
    useMemo(() => selectAtom(composeAtom, ({ editFor }) => editFor !== null), [composeAtom]),
  );
  return (
    <div className={className}>
      <div className="flex flex-col gap-2">
        <div className="flex gap-1">
          <InGameSwitchButton />
          <AddDiceButton />
          <div className="flex-grow flex gap-1 justify-end">
            {editMode && <ResetComposeButton />}
            <SendButton me={me} editMode={editMode} />
          </div>
        </div>
        <ComposeTextArea me={me} />
      </div>
    </div>
  );
};
