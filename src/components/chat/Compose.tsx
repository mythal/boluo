import React, { useEffect, useRef, useState } from 'react';
import { ActionIcon, BroadcastIcon, CharacterIcon, HistoryIcon, SendIcon } from '../icons';
import { KeyTooltip } from './KeyTooltip';
import { Id, newId } from '../../id';
import { SendAction } from './ChannelChat';
import { ChannelMember } from '../../api/channels';
import { checkCharacterName } from '../../validators';
import { cls } from '../../classname';
import { parse } from '../../parser';
import { NewPreview } from '../../api/messages';
import { post } from '../../api/request';
import { throwErr } from '../../helper';
import { useDispatch } from '../App';
import { User } from '../../api/users';
import { EditChannelSettings } from './EditChannelSettings';

interface Props {
  channelId: Id;
  sendAction: SendAction;
  member: ChannelMember;
  profile: User;
}

const PREVIEW_SEND_TIMEOUT_MILLIS = 200;
const useSendPreview = (sendAction: SendAction) => {
  const sendPreviewTimeout = useRef<number | null>(null);
  return (preview: NewPreview) => {
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
  const sendPreview = useSendPreview(sendAction);
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
  const nameError = checkCharacterName(name);
  const canSendPreview = !inGame || nameError.isOk;
  const canSend = text.trim().length > 0 && canSendPreview;

  if (sendPreviewFlag.current) {
    sendPreviewFlag.current = false;
    if (canSendPreview) {
      const content = isBroadcast ? parse(text) : { text: null, entities: [] };
      sendPreview({
        id,
        channelId,
        name: inGame ? name : profile.nickname,
        mediaId: null,
        inGame,
        isAction,
        start: startRef.current,
        ...content,
      });
    }
  }

  const handleText: React.ChangeEventHandler<HTMLTextAreaElement> = e => {
    const value = e.target.value;
    setText(value);
    if (text.length === 0 && value.length > 0) {
      reset();
    }
    sendPreviewFlag.current = true;
  };

  const handleName = (value: string) => {
    setName(value);
    sendPreviewFlag.current = true;
  };

  const toggleInGame = () => {
    setInGame(!inGame);
    sendPreviewFlag.current = true;
  };

  const toggleIsAction = () => {
    setIsAction(!isAction);
    sendPreviewFlag.current = true;
  };

  const toggleIsBroadcast = () => {
    setIsBroadcast(!isBroadcast);
    sendPreviewFlag.current = true;
  };

  const handleSend = async () => {
    if (!canSend) {
      return;
    }
    const parsed = parse(text);
    const sent = await post('/messages/send', {
      messageId: id,
      channelId,
      name: inGame ? name : profile.nickname,
      inGame,
      isAction,
      orderDate: startRef.current,
      ...parsed,
    });
    if (sent.isOk) {
      setText('');
      setIsAction(false);
      reset();
      sendPreviewFlag.current = false;
    } else {
      throwErr(dispatch)(sent.value);
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
    <div className="h-40 flex-initial flex flex-col p-1 border-t border-gray-500">
      <div className="text-right mb-1 sm:flex sm:justify-between">
        <div className="mb-1">
          <input
            className="input"
            disabled={!inGame}
            value={inGame ? name : profile.nickname}
            onChange={e => handleName(e.target.value)}
          />
          <EditChannelSettings member={member} />
          {/*<KeyTooltip help="历史名字" keyHelp="">*/}
          {/*  <button className="btn">*/}
          {/*    <HistoryIcon/>*/}
          {/*  </button>*/}
          {/*</KeyTooltip>*/}
          <KeyTooltip help="游戏内消息" keyHelp="Tab">
            <button onClick={toggleInGame} className={cls('btn', { 'btn-down': inGame })}>
              <CharacterIcon />
            </button>
          </KeyTooltip>
        </div>
        <div className="mb-1">
          <KeyTooltip help="发送实时预览" keyHelp="Ctrl + Q">
            <button onClick={toggleIsBroadcast} className={cls('btn', { 'btn-down': isBroadcast })}>
              <BroadcastIcon />
            </button>
          </KeyTooltip>
          <KeyTooltip help="表示动作" keyHelp="Ctrl + M">
            <button onClick={toggleIsAction} className={cls('btn', { 'btn-down': isAction })}>
              <ActionIcon />
            </button>
          </KeyTooltip>
          <KeyTooltip help="发送" keyHelp="Ctrl / ⌘ + ↵">
            <button className="btn btn-primary" disabled={!canSend} onClick={handleSend}>
              <SendIcon className="mr-2" />
              发送
            </button>
          </KeyTooltip>
        </div>
      </div>
      <textarea
        onKeyDown={handleKey}
        value={text}
        onChange={handleText}
        placeholder="你的故事……"
        autoFocus
        className="w-full h-full outline-none resize-none"
      />
    </div>
  );
});
