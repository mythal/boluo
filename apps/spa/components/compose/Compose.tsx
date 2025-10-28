'use client';
import type { MemberWithUser, User } from '@boluo/api';
import { useAtomValue } from 'jotai';
import { type FC, useDeferredValue, useEffect, useMemo } from 'react';
import { useMediaDrop } from '../../hooks/useMediaDrop';
import { AddDiceButton } from './AddDiceButton';
import { ComposeTextArea } from './ComposeTextArea';
import { InGameSwitchButton } from './InGameSwitchButton';
import { SendButton } from './SendButton';
import { FileButton } from './FileButton';
import { useChannelAtoms, type ChannelAtoms } from '../../hooks/useChannelAtoms';
import { useSend } from '../pane-channel/useSend';
import { EditMessageBanner } from './EditMessageBanner';
import { MediaLine } from './MediaLine';
import { useSettings } from '../../hooks/useSettings';
import { FormattedMessage } from 'react-intl';
import { ErrorBoundary } from '@sentry/nextjs';
import { ComposeFallback } from '@boluo/ui/ComposeFallback';
import { useBackupCompose } from '../../hooks/useBackupCompose';

interface Props {
  member: MemberWithUser;
  channelAtoms: ChannelAtoms;
}

export const COMPOSE_BACKUP_TIMEOUT = 2000;
export const composeBackupKey = (channelId: string) => `compose-backup:${channelId}`;

const DeferredComposeTextArea: FC<{
  parsedAtom: ChannelAtoms['parsedAtom'];
  currentUser: User;
  enterSend: boolean;
  channelId: string;
  isEditing: boolean;
  send: () => Promise<void>;
}> = ({ parsedAtom, currentUser, send, enterSend, channelId, isEditing }) => {
  const parsed = useDeferredValue(useAtomValue(parsedAtom));
  useBackupCompose(channelId, parsed, isEditing);
  const compose = useMemo(
    () => (
      <ComposeTextArea myId={currentUser.id} send={send} enterSend={enterSend} parsed={parsed} />
    ),
    [currentUser.id, enterSend, parsed, send],
  );
  return compose;
};

export const Compose = ({ member, channelAtoms }: Props) => {
  const { inGameAtom, isWhisperAtom, parsedAtom, isEditingAtom } = channelAtoms;
  const settings = useSettings();
  const enterSend = settings?.enterSend === true;
  const send = useSend();
  const { onDrop } = useMediaDrop();
  useEffect(() => {
    const { virtualKeyboard } = navigator;
    if (!virtualKeyboard) return;
    virtualKeyboard.overlaysContent = true;
  }, []);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // This is important to prevent the browser's default handling of the data
  };
  const isEditing = useAtomValue(isEditingAtom);
  const inGame = useAtomValue(inGameAtom);
  const isWhisper = useAtomValue(isWhisperAtom);
  const editMessageBanner = useMemo(() => {
    if (!isEditing) return null;
    return <EditMessageBanner currentUser={member.user} />;
  }, [isEditing, member.user]);
  const fileButton = useMemo(() => <FileButton />, []);
  const inGameSwitchButton = useMemo(() => <InGameSwitchButton />, []);
  const addDiceButton = useMemo(() => <AddDiceButton />, []);
  const sendButton = useMemo(
    () => <SendButton send={send} isEditing={isEditing} />,
    [isEditing, send],
  );
  const mediaLine = useMemo(() => <MediaLine />, []);

  return (
    <ErrorBoundary fallback={<ComposeError />}>
      <div
        onDrop={onDrop}
        onDragOver={handleDragOver}
        className="bg-surface-muted standalone-bottom-padding border-border-subtle col-span-full border-t p-2"
      >
        {editMessageBanner}
        <div
          data-in-game={inGame}
          data-whisper={isWhisper}
          className="bg-surface-raised focus-within:border-border-strong data-[in-game=true]:bg-message-inGame-bg border-border-default relative flex items-end gap-1 rounded border data-[whisper=true]:border-dashed"
        >
          {fileButton}
          {inGameSwitchButton}
          <DeferredComposeTextArea
            parsedAtom={parsedAtom}
            currentUser={member.user}
            enterSend={enterSend}
            channelId={member.channel.channelId}
            send={send}
            isEditing={isEditing}
          />

          {addDiceButton}
          {sendButton}
        </div>
        <div>{mediaLine}</div>
        <div className="h-[env(keyboard-inset-height,0px)] overflow-hidden">
          <div className="px-1 py-4">
            <FormattedMessage defaultMessage="If you see this text, please try to swipe down ↓ to display the content." />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export const ComposeError: FC = () => {
  const { composeAtom } = useChannelAtoms();
  const source = useAtomValue(composeAtom).source;
  return <ComposeFallback source={source} />;
};
