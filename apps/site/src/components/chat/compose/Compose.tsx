'use client';
import type { GetMe } from 'boluo-api';
import { useState } from 'react';
import { post } from '../../../api/browser';
import { useChannelId } from '../../../hooks/useChannelId';

interface Props {
  me: GetMe;
  className?: string;
}

export const Compose = ({ me, className }: Props) => {
  const channelId = useChannelId();
  const [text, setText] = useState('');
  const onSubmit = async () => {
    const result = await post('/messages/send', null, {
      messageId: null,
      channelId,
      name: me.user.nickname,
      text,
      entities: [],
      inGame: false,
      isAction: false,
      mediaId: null,
      pos: null,
      whisperToUsers: null,
    });
    if (result.isOk) {
      setText('');
    }
  };

  return (
    <div className={className}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        className="input input-default w-full h-full resize-none"
      >
      </textarea>
    </div>
  );
};
