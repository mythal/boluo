'use client';
import type { Member } from '@boluo/api';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useDeferredValue, useMemo } from 'react';
import { useMediaDrop } from '../../hooks/useMediaDrop';
import { AddDiceButton } from './AddDiceButton';
import { ComposeTextArea } from './ComposeTextArea';
import { InGameSwitchButton } from './InGameSwitchButton';
import { ResetComposeButton } from './ResetComposeButton';
import { SendButton } from './SendButton';
import { FileButton } from './FileButton';
import { ChannelAtoms } from '../../hooks/useChannelAtoms';
import { useQuerySettings } from '../../hooks/useQuerySettings';
import { useSend } from '../pane-channel/useSend';

interface Props {
  member: Member;
  parsedAtom: ChannelAtoms['parsedAtom'];
  composeAtom: ChannelAtoms['composeAtom'];
  className?: string;
}

export const Compose = ({ member, className, parsedAtom, composeAtom }: Props) => {
  const { data: settings } = useQuerySettings();
  const enterSend = settings?.enterSend === true;
  const send = useSend(member.user);
  const { onDrop } = useMediaDrop();

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // This is important to prevent the browser's default handling of the data
  };
  const editMode = useAtomValue(
    useMemo(() => selectAtom(composeAtom, ({ editFor }) => editFor !== null), [composeAtom]),
  );
  const parsed = useDeferredValue(useAtomValue(parsedAtom));
  const compose = useMemo(
    () => <ComposeTextArea send={send} enterSend={enterSend} parsed={parsed} />,
    [enterSend, parsed, send],
  );
  return (
    <div className={className} onDrop={onDrop} onDragOver={handleDragOver}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1 ">
          <div className="flex-shrink-0">
            <InGameSwitchButton />
          </div>

          <div className="flex-shrink-0">
            <AddDiceButton />
          </div>
          <div className="flex-shrink-0">
            <FileButton />
          </div>
          <div className="w-full flex-shrink flex-grow" />
          <div className="flex-shrink-0">
            <ResetComposeButton />
          </div>
          <div className="flex-shrink-0">
            <SendButton send={send} currentUser={member.user} editMode={editMode} />
          </div>
        </div>
        {compose}
      </div>
    </div>
  );
};
