import React, { useRef, useState } from 'react';
import { Channel, ChannelMember } from '../api/channels';
import { Id, newId } from '../id';
import { User } from '../api/users';
import { parse } from '../parser';
import { post } from '../api/request';
import { errorText } from '../api/error';
import { NewPreview } from '../api/messages';
import { checkDisplayName, getErrorMessage } from '../validators';
import { InputField } from '../From/InputField';

interface Props {
  me: User;
  member: ChannelMember;
  channel: Channel;
}

type HandleName = React.ChangeEventHandler<HTMLInputElement>;
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
  const [nameError, setNameError] = useState('');
  const [inGame, setInGame] = useState(true);
  const [isAction, setIsAction] = useState(false);
  const [isBroadcast, setIsBroadcast] = useState(true);
  const idRef = useRef<Id>(newId());
  const startRef = useRef<number>(new Date().getTime());
  const sendPreview = useSendPreview();
  const sendPreviewFlag = useRef(false);
  const id = idRef.current;

  const ok = text.trim().length > 0 && nameError === '';

  const channelId = channel.id;
  if (sendPreviewFlag.current && ok && isBroadcast) {
    sendPreviewFlag.current = false;
    const parsed = parse(text);
    sendPreview({
      id,
      channelId: channel.id,
      name: inGame ? name : me.nickname,
      mediaId: null,
      inGame,
      isAction,
      whisperToUsers: null,
      start: startRef.current,
      ...parsed,
    });
  }

  const handleText: HandleText = e => {
    const value = e.target.value;
    setText(value);
    sendPreviewFlag.current = true;
  };

  const handleName = (value: string) => {
    setName(value);
    setNameError(getErrorMessage(checkDisplayName(value)));
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

  const handleKey: React.KeyboardEventHandler = async e => {
    // Ctrl/⌘ + ↵
    if (e.metaKey && e.keyCode === 13) {
      e.preventDefault();
      await handleSend();
    }
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

  return (
    <form className="border-t" onSubmit={handleSubmit}>
      <div className="flex items-end justify-between">
        <div className="ml-2">
          <InputField label="名字" value={inGame ? name : me.nickname} onChange={handleName} disabled={!inGame} />
          <div>{nameError}</div>
        </div>

        <div className="text-lg">
          <button type="button" className="btn m-1 p-2" onClick={toggleIsBroadcast}>
            {isBroadcast ? '预览中' : '实时预览关'}
          </button>
          <button type="button" className="btn m-1 p-2" onClick={toggleInGame}>
            {inGame ? '游戏内' : '游戏外'}
          </button>
          <button type="button" className="btn m-1 p-2" onClick={toggleIsAction}>
            {isAction ? '动作' : '发言'}
          </button>

          <button className="btn m-1 p-2" type="submit" disabled={!ok}>
            发送 (Ctrl/⌘ + ↵)
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
