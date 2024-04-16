'use client';
import type { Member } from '@boluo/api';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useDeferredValue, useMemo } from 'react';
import { useMediaDrop } from '../../hooks/useMediaDrop';
import { AddDiceButton } from './AddDiceButton';
import { ComposeTextArea } from './ComposeTextArea';
import { InGameSwitchButton } from './InGameSwitchButton';
import { SendButton } from './SendButton';
import { FileButton } from './FileButton';
import { ChannelAtoms } from '../../hooks/useChannelAtoms';
import { useQuerySettings } from '../../hooks/useQuerySettings';
import { useSend } from '../pane-channel/useSend';
import { EditMessageBanner } from './EditMessageBanner';
import { ComposeMedia } from './ComposeMedia';

interface Props {
  member: Member;
  channelAtoms: ChannelAtoms;
}

export const Compose = ({ member, channelAtoms }: Props) => {
  const { composeAtom, inGameAtom, isWhisperAtom, parsedAtom } = channelAtoms;
  const { data: settings } = useQuerySettings();
  const enterSend = settings?.enterSend === true;
  const send = useSend(member.user);
  const { onDrop } = useMediaDrop();

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // This is important to prevent the browser's default handling of the data
  };
  const isEditing = useAtomValue(
    useMemo(() => selectAtom(composeAtom, ({ editFor }) => editFor != null), [composeAtom]),
  );
  const composeMedia = useAtomValue(useMemo(() => selectAtom(composeAtom, ({ media }) => media), [composeAtom]));
  const parsed = useDeferredValue(useAtomValue(parsedAtom));
  const compose = useMemo(
    () => <ComposeTextArea myId={member.user.id} send={send} enterSend={enterSend} parsed={parsed} />,
    [enterSend, member.user.id, parsed, send],
  );
  const inGame = useAtomValue(inGameAtom);
  const isWhisper = useAtomValue(isWhisperAtom);
  const editMessageBanner = useMemo(() => {
    if (!isEditing) return null;
    return <EditMessageBanner currentUser={member.user} />;
  }, [isEditing, member.user]);
  return (
    <div onDrop={onDrop} onDragOver={handleDragOver} className="bg-compose-outer-bg col-span-full border-t p-2">
      {editMessageBanner}
      <div
        data-in-game={inGame}
        data-whisper={isWhisper}
        className="bg-compose-bg focus-within:border-surface-400 border-lowest data-[in-game=true]:bg-message-inGame-bg relative flex items-end gap-1 rounded border data-[whisper=true]:border-dashed"
      >
        <div className="relative flex-shrink-0 self-start py-1 pl-1">
          {composeMedia != null && !isEditing && (
            <div className="absolute bottom-full left-0 z-20 h-max w-max">
              <ComposeMedia className="bg-compose-media-bg rounded px-1 py-1 shadow" media={composeMedia} />
            </div>
          )}

          <FileButton />
        </div>
        <div className="flex-shrink-0 self-start py-1">
          <InGameSwitchButton />
        </div>
        {compose}

        <div className="flex-shrink-0 self-end py-1">
          <AddDiceButton />
        </div>
        <div className="flex-shrink-0 self-end py-1 pr-1">
          <SendButton send={send} currentUser={member.user} isEditing={isEditing} />
        </div>
      </div>
    </div>
  );
};
