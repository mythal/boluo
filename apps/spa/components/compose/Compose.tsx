'use client';
import type { Member, User } from '@boluo/api';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, useDeferredValue, useMemo } from 'react';
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
import { MediaLine } from './MediaLine';

interface Props {
  member: Member;
  channelAtoms: ChannelAtoms;
}

const DeferredComposeTextArea: FC<{
  parsedAtom: ChannelAtoms['parsedAtom'];
  currentUser: User;
  enterSend: boolean;
  send: () => Promise<void>;
}> = ({ parsedAtom, currentUser, send, enterSend }) => {
  const parsed = useDeferredValue(useAtomValue(parsedAtom));
  const compose = useMemo(
    () => <ComposeTextArea myId={currentUser.id} send={send} enterSend={enterSend} parsed={parsed} />,
    [currentUser.id, enterSend, parsed, send],
  );
  return compose;
};

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
  const inGame = useAtomValue(inGameAtom);
  const isWhisper = useAtomValue(isWhisperAtom);
  const editMessageBanner = useMemo(() => {
    if (!isEditing) return null;
    return <EditMessageBanner currentUser={member.user} />;
  }, [isEditing, member.user]);
  const fileButton = useMemo(() => <FileButton />, []);
  const inGameSwitchButton = useMemo(
    () => <InGameSwitchButton channelId={member.channel.channelId} />,
    [member.channel.channelId],
  );
  const addDiceButton = useMemo(() => <AddDiceButton />, []);
  const sendButton = useMemo(
    () => <SendButton send={send} currentUser={member.user} isEditing={isEditing} />,
    [isEditing, member.user, send],
  );
  const mediaLine = useMemo(() => <MediaLine />, []);
  return (
    <div onDrop={onDrop} onDragOver={handleDragOver} className="bg-compose-outer-bg col-span-full border-t p-2">
      {editMessageBanner}
      <div
        data-in-game={inGame}
        data-whisper={isWhisper}
        className="bg-compose-bg focus-within:border-surface-400 border-lowest data-[in-game=true]:bg-message-inGame-bg relative flex items-end gap-1 rounded border data-[whisper=true]:border-dashed"
      >
        <div className="relative flex-shrink-0 py-1 pl-1">{fileButton}</div>
        <div className="flex-shrink-0 py-1">{inGameSwitchButton}</div>
        <DeferredComposeTextArea parsedAtom={parsedAtom} currentUser={member.user} enterSend={enterSend} send={send} />

        <div className="flex-shrink-0 self-end py-1">{addDiceButton}</div>
        <div className="flex-shrink-0 self-end py-1 pr-1">{sendButton}</div>
      </div>
      <div>{mediaLine}</div>
    </div>
  );
};
