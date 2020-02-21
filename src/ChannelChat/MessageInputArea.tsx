import React, { useRef, useState } from 'react';
import { Channel, ChannelMember } from '../api/channels';
import { Id, newId } from '../id';
import { User } from '../api/users';
import { parse } from '../parser';
import { post } from '../api/request';
import { errorText } from '../api/error';
import { NewPreview } from '../api/messages';
import { checkCharacterName } from '../validators';
import { InputField } from '../From/InputField';
import { classNames } from '../classname';

interface Props {
  me: User;
  member: ChannelMember;
  channel: Channel;
}

type HandleText = React.ChangeEventHandler<HTMLTextAreaElement>;
type HandleSubmit = React.FormEventHandler<HTMLFormElement>;

const useSendPreview = () => {
  const PREVIEW_SEND_TIMEOUT_MILLIS = 300;

  const sendPreviewTimeout = useRef<number | null>(null);
  return (newPreview: NewPreview) => {
    if (sendPreviewTimeout.current !== null) {
      window.clearTimeout(sendPreviewTimeout.current);
      sendPreviewTimeout.current = null;
    }
    sendPreviewTimeout.current = window.setTimeout(async () => {
      await post('/messages/preview', newPreview);
      sendPreviewTimeout.current = null;
    }, PREVIEW_SEND_TIMEOUT_MILLIS);
  };
};

export const MessageInputArea: React.FC<Props> = ({ me, member, channel }) => {
  const [text, setText] = useState('');
  const [name, setName] = useState(member.characterName);
  const [inGame, setInGame] = useState(true);
  const [isAction, setIsAction] = useState(false);
  const [isBroadcast, setIsBroadcast] = useState(true);
  const idRef = useRef<Id>(newId());
  const startRef = useRef<number>(new Date().getTime());
  const sendPreview = useSendPreview();
  const sendPreviewFlag = useRef(false);
  const id = idRef.current;

  const nameError = checkCharacterName(name);

  const ok = text.trim().length > 0 && (!inGame || nameError.isOk);

  const channelId = channel.id;
  if (sendPreviewFlag.current) {
    sendPreviewFlag.current = false;
    const hasContent = ok && isBroadcast;
    const content = hasContent ? parse(text) : { text: '', entities: [] };
    sendPreview({
      id,
      channelId: channel.id,
      name: inGame ? name : me.nickname,
      mediaId: null,
      inGame,
      isAction,
      whisperToUsers: null,
      start: startRef.current,
      ...content,
    });
  }

  const handleText: HandleText = e => {
    const value = e.target.value;
    setText(value);
    sendPreviewFlag.current = true;
  };

  const handleName = (value: string) => {
    setName(value);
    sendPreviewFlag.current = true;
  };

  const handleSend = async () => {
    if (!ok) {
      return;
    }
    const parsed = parse(text);
    const sent = await post('/messages/send', {
      messageId: id,
      channelId,
      name: inGame ? name : me.nickname,
      inGame,
      isAction,
      ...parsed,
    });
    if (sent.isOk) {
      setText('');
      setIsAction(false);
      idRef.current = newId();
    } else {
      alert(errorText(sent.value));
    }
  };

  const handleSubmit: HandleSubmit = async e => {
    e.preventDefault();
    await handleSend();
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

  const handleKey: React.KeyboardEventHandler = async e => {
    // Ctrl/⌘ + ↵
    if ((e.metaKey || e.ctrlKey) && e.keyCode === 13) {
      e.preventDefault();
      await handleSend();
    }
    // Alt + P
    if (e.altKey && e.keyCode === 80) {
      e.preventDefault();
      toggleIsBroadcast();
    }
    // Alt + G
    if (e.altKey && e.keyCode === 71) {
      e.preventDefault();
      toggleInGame();
    }
    // Alt + A
    if (e.altKey && e.keyCode === 65) {
      e.preventDefault();
      toggleIsAction();
    }
  };

  return (
    <form className="border-t" onSubmit={handleSubmit}>
      <div className="flex items-end justify-between">
        <div className="ml-2">
          <InputField
            label="名字"
            value={inGame ? name : me.nickname}
            error={inGame ? nameError.err() : undefined}
            onChange={handleName}
            disabled={!inGame}
          />
        </div>

        <div className="text-lg flex">
          <button
            type="button"
            className={classNames('flex flex-col m-1 p-2', isBroadcast ? 'btn' : 'btn-down')}
            onClick={toggleIsBroadcast}
          >
            <span>实时预览</span>
            <span className="text-xs">Alt + P</span>
          </button>
          <button
            type="button"
            className={classNames('flex flex-col m-1 p-2', inGame ? 'btn' : 'btn-down')}
            onClick={toggleInGame}
          >
            <span>游戏外</span>
            <span className="text-xs">Alt + G</span>
          </button>
          <button
            type="button"
            className={classNames('flex flex-col m-1 p-2', isAction ? 'btn-down' : 'btn')}
            onClick={toggleIsAction}
          >
            <span>动作</span>
            <span className="text-xs">Alt + A</span>
          </button>

          <button className="btn m-1 p-2 flex flex-col inline-block" type="submit" disabled={!ok}>
            <span className="">发送</span>
            <span className="text-xs">Ctrl/⌘ + ↵</span>
          </button>
        </div>
      </div>
      <textarea
        className="w-full h-32 text-base p-2"
        value={text}
        onChange={handleText}
        onKeyDown={handleKey}
        placeholder="说点什么…"
      />
    </form>
  );
};
