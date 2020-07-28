import * as React from 'react';
import { css } from '@emotion/core';
import { SendEvent } from './ChannelChat';
import { useRef, useState } from 'react';
import { post } from '../../api/request';
import { newId } from '../../utils/id';
import { ProfileState } from '../../reducers/profile';
import { parse, Env as ParseEnv } from '../../interpreter/parser';
import { getDiceFace } from '../../utils/game';
import { Channel } from '../../api/channels';

interface Props {
  sendEvent: SendEvent;
  profile: ProfileState;
  channel: Channel;
}

const container = css`
  background-color: teal;
  grid-area: compose;
  height: 8rem;
`;

const input = css`
  display: block;
  width: 100%;
`;

function ChatCompose({ sendEvent, channel, profile }: Props) {
  const channelId = channel.id;
  const messageId = useRef(newId());
  const [draft, setDraft] = useState('');
  const [inGame, setInGame] = useState(false);
  const [isAction, setIsAction] = useState(false);
  const parserEnv: ParseEnv = {
    defaultDiceFace: getDiceFace(channel.defaultDiceType),
    resolveUsername: () => null,
  };

  const onSend = async () => {
    const parsed = parse(draft, true, parserEnv);
    const sent = await post('/messages/send', {
      messageId: messageId.current,
      channelId,
      mediaId: null,
      name: inGame ? name : profile.user.nickname,
      inGame,
      isAction,
      orderDate: null,
      ...parsed,
    });
    console.log(sent);
    messageId.current = newId();
  };

  return (
    <div css={container}>
      <textarea css={input} value={draft} onChange={(e) => setDraft(e.target.value)} />
      <div>
        <button onClick={onSend}>发送</button>
      </div>
    </div>
  );
}

export default ChatCompose;
