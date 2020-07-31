import * as React from 'react';
import { css } from '@emotion/core';
import { useRef, useState } from 'react';
import { post } from '@/api/request';
import { newId } from '@/utils/id';
import { parse, Env as ParseEnv } from '../../interpreter/parser';
import { getDiceFace } from '@/utils/game';
import { useSelector } from '@/store';

const container = css`
  background-color: teal;
  grid-area: compose;
  height: 8rem;
`;

const input = css`
  display: block;
  width: 100%;
`;

function ChatCompose() {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const channelId = useSelector((state) => state.chat!.channel.id);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const defaultDiceType = useSelector((state) => state.chat!.channel.defaultDiceType);
  const nickname = useSelector((state) => state.profile?.user.nickname);
  const messageId = useRef(newId());
  const [draft, setDraft] = useState('');
  const [inGame, setInGame] = useState(false);
  const [isAction, setIsAction] = useState(false);

  if (nickname === undefined) {
    return null;
  }

  const parserEnv: ParseEnv = {
    defaultDiceFace: getDiceFace(defaultDiceType),
    resolveUsername: () => null,
  };

  const onSend = async () => {
    const parsed = parse(draft, true, parserEnv);
    const sent = await post('/messages/send', {
      messageId: messageId.current,
      channelId,
      mediaId: null,
      name: inGame ? name : nickname,
      inGame,
      isAction,
      orderDate: null,
      ...parsed,
    });
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
