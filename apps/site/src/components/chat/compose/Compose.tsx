'use client';
import type { GetMe } from 'api';
import { useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useCallback, useMemo, useRef } from 'react';
import { post } from '../../../api/browser';
import { useChannelId } from '../../../hooks/useChannelId';
import { makeComposeAction } from '../../../state/actions/compose';
import { composeAtomFamily } from '../../../state/atoms/compose';

interface Props {
  me: GetMe;
  className?: string;
}

export const Compose = ({ me, className }: Props) => {
  const channelId = useChannelId();
  const composeAtom = useMemo(() => composeAtomFamily(channelId), [channelId]);
  const dispatch = useSetAtom(composeAtom);
  const sourceAtom = useMemo(() => selectAtom(composeAtom, compose => compose.source), [composeAtom]);
  const source = useAtomValue(sourceAtom);
  const isCompositionRef = useRef(false);

  const setSource = useCallback(
    (source: string) => dispatch(makeComposeAction('setSource', { channelId, source })),
    [channelId, dispatch],
  );
  const onSubmit = async () => {
    const result = await post('/messages/send', null, {
      messageId: null,
      channelId,
      name: me.user.nickname,
      text: source,
      entities: [],
      inGame: false,
      isAction: false,
      mediaId: null,
      pos: null,
      whisperToUsers: null,
    });
    if (result.isOk) {
      setSource('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSource(e.target.value);
  };

  return (
    <div className={className}>
      <textarea
        value={source}
        onChange={handleChange}
        onCompositionStart={() => (isCompositionRef.current = true)}
        onCompositionEnd={() => (isCompositionRef.current = false)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        className="input input-default w-full h-full resize-none"
      >
      </textarea>
    </div>
  );
};
