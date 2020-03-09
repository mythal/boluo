import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Id, newId } from '../../id';
import { SendAction } from './ChannelChat';
import { ChannelMember } from '../../api/channels';
import { checkCharacterName } from '../../validators';
import { parse } from '../../parser';
import { post } from '../../api/request';
import { throwErr } from '../../helper';
import { useDispatch } from '../Provider';
import { User } from '../../api/users';
import { EditChannelSettings } from './EditChannelSettings';
import { UploadButton } from './UploadButton';
import { upload } from '../../api/media';
import { InGameButton } from './InGameButton';
import { BroadcastButton } from './BroadcastButton';
import { ActionButton } from './ActionButton';
import { SendButton } from './SendButton';
import { NewPreview } from '../../api/events';

interface Props {
  channelId: Id;
  sendAction: SendAction;
  member: ChannelMember;
  profile: User;
}

const PREVIEW_SEND_TIMEOUT_MILLIS = 200;
const useSendPreview = (sendAction: SendAction, nickname: string) => {
  const sendPreviewTimeout = useRef<number | null>(null);
  return (
    id: Id,
    channelId: Id,
    inGame: boolean,
    isAction: boolean,
    isBroadcast: boolean,
    characterName: string,
    start: number,
    text: string
  ) => {
    const content = isBroadcast ? parse(text) : { text: null, entities: [] };
    const name = inGame ? characterName : nickname;

    const preview: NewPreview = {
      id,
      channelId,
      name,
      mediaId: null,
      inGame,
      isAction,
      start,
      ...content,
    };

    if (sendPreviewTimeout.current !== null) {
      window.clearTimeout(sendPreviewTimeout.current);
      sendPreviewTimeout.current = null;
    }
    sendPreviewTimeout.current = window.setTimeout(async () => {
      sendAction({ type: 'preview', preview });
      sendPreviewTimeout.current = null;
    }, PREVIEW_SEND_TIMEOUT_MILLIS);
  };
};

export const Compose = React.memo<Props>(({ channelId, sendAction, member, profile }) => {
  const dispatch = useDispatch();
  const [text, setText] = useState('');
  const [name, setName] = useState(member.characterName);
  const [inGame, setInGame] = useState(true);
  const [isAction, setIsAction] = useState(false);
  const [isBroadcast, setIsBroadcast] = useState(true);
  const [media, setMedia] = useState<File | null>(null);
  const [sending, setSending] = useState<boolean>(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const sendPreview = useSendPreview(sendAction, profile.nickname);
  const startRef = useRef<number>(new Date().getTime());
  const idRef = useRef<Id>(newId());
  const sendPreviewFlag = useRef(false);
  useEffect(() => {
    if (name !== member.characterName) {
      setName(member.characterName);
    }
  }, [member.characterName]);

  const reset = () => {
    startRef.current = new Date().getTime();
    idRef.current = newId();
  };

  const id = idRef.current;
  const canSendPreview = !inGame || nameError === null;
  const canSend = text.trim().length > 0 && canSendPreview && !sending && mediaError === null;

  if (sendPreviewFlag.current) {
    sendPreviewFlag.current = false;
    if (canSendPreview) {
      sendPreview(id, channelId, inGame, isAction, isBroadcast, name, startRef.current, text);
    }
  }

  type TextChangeHandler = React.ChangeEventHandler<HTMLTextAreaElement>;
  const handleText = useCallback<TextChangeHandler>(
    e => {
      const value = e.target.value;
      setText(value);
      if (text.length === 0 && value.length > 0) {
        reset();
      }
      sendPreviewFlag.current = true;
    },
    [text]
  );

  const handleName = useCallback((value: string) => {
    const result = checkCharacterName(value);
    setNameError(result.err());
    setName(value);
    sendPreviewFlag.current = true;
  }, []);

  const toggleInGame = useCallback(() => {
    setInGame(inGame => !inGame);
    sendPreviewFlag.current = true;
  }, []);

  const toggleIsAction = useCallback(() => {
    setIsAction(isAction => !isAction);
    sendPreviewFlag.current = true;
  }, []);

  const toggleIsBroadcast = useCallback(() => {
    setIsBroadcast(isBroadcast => !isBroadcast);
    sendPreviewFlag.current = true;
  }, []);

  const handleSend = async () => {
    if (!canSend) {
      return;
    }
    setSending(true);
    const parsed = parse(text);
    let mediaId = null;

    if (media) {
      const uploaded = await upload(media, media.name, media.type);
      if (uploaded.isErr) {
        throwErr(dispatch)(uploaded.value);
        setSending(false);
        return;
      }
      mediaId = uploaded.value.id;
    }
    const sent = await post('/messages/send', {
      messageId: id,
      channelId,
      name: inGame ? name : profile.nickname,
      inGame,
      isAction,
      mediaId,
      orderDate: startRef.current,
      ...parsed,
    });
    if (sent.isOk) {
      setText('');
      setIsAction(false);
      reset();
      sendPreviewFlag.current = false;
      setSending(false);
    } else {
      throwErr(dispatch)(sent.value);
      setSending(false);
    }
  };

  const handleKey: React.KeyboardEventHandler = async e => {
    // Tab
    if (e.keyCode === 9) {
      e.preventDefault();
      toggleInGame();
    }
    // Ctrl/⌘ + ↵
    if ((e.metaKey || e.ctrlKey) && e.keyCode === 13) {
      e.preventDefault();
      await handleSend();
    }
    // Ctrl + Q
    if (e.ctrlKey && e.keyCode === 81) {
      e.preventDefault();
      toggleIsBroadcast();
    }
    // Ctrl + M
    if (e.ctrlKey && e.keyCode === 77) {
      e.preventDefault();
      toggleIsAction();
    }
  };

  return (
    <div className="flex-initial p-1 border-t border-gray-500" onKeyDown={handleKey}>
      {(nameError || mediaError) && <div className="text-center p-2">{nameError || mediaError}</div>}
      <div className="text-right mb-1 sm:flex sm:justify-between">
        <div className="mb-1">
          <input
            className="input"
            disabled={!inGame}
            value={inGame ? name : profile.nickname}
            onChange={e => handleName(e.target.value)}
          />
          <EditChannelSettings member={member} />
          <InGameButton toggle={toggleInGame} inGame={inGame} />
          <UploadButton file={media} setFile={setMedia} setError={setMediaError} />
        </div>
        <div className="mb-1">
          <BroadcastButton toggle={toggleIsBroadcast} isBroadcast={isBroadcast} />
          <ActionButton toggle={toggleIsAction} isAction={isAction} />
          <SendButton send={handleSend} canSend={canSend} sending={sending} />
        </div>
      </div>
      <textarea
        value={text}
        onChange={handleText}
        placeholder="你的故事……"
        autoFocus
        className="w-full h-32 outline-none resize-none"
      />
    </div>
  );
});
