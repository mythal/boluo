'use client';
import type { ChannelMember, GetMe } from 'api';
import { useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useCallback, useMemo, useState } from 'react';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { useMediaDrop } from '../../hooks/useMediaDrop';
import { AddDiceButton } from './AddDiceButton';
import { ComposeTextArea } from './ComposeTextArea';
import { InGameSwitchButton } from './InGameSwitchButton';
import { ResetComposeButton } from './ResetComposeButton';
import { SendButton } from './SendButton';

interface Props {
  me: GetMe;
  member: ChannelMember;
  className?: string;
}

export const Compose = ({ me, member, className }: Props) => {
  const composeAtom = useComposeAtom();

  const { onDrop } = useMediaDrop();

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // This is important to prevent the browser's default handling of the data
  };
  const editMode = useAtomValue(
    useMemo(() => selectAtom(composeAtom, ({ editFor }) => editFor !== null), [composeAtom]),
  );
  return (
    <div className={className} onDrop={onDrop} onDragOver={handleDragOver}>
      <div className="flex flex-col gap-2">
        <div className="flex gap-1 items-center ">
          <div className="flex-shrink-0">
            <InGameSwitchButton />
          </div>

          <div className="flex-shrink-0">
            <AddDiceButton />
          </div>
          <div className="flex-shrink flex-grow w-full" />
          {editMode && <ResetComposeButton />}
          <div className="flex-shrink-0">
            <SendButton me={me} editMode={editMode} member={member} />
          </div>
        </div>
        <ComposeTextArea me={me} member={member} />
      </div>
    </div>
  );
};
