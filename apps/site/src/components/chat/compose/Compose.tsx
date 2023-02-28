'use client';
import type { ClientEvent, GetMe, PreviewPost } from 'api';
import { useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { makeId } from 'utils';
import { post } from '../../../api/browser';
import { useChannelId } from '../../../hooks/useChannelId';
import { composeAtomFamily, makeComposeAction } from '../../../state/compose';
import { getConnection } from '../../../state/connection';
import { store } from '../../../state/store';

const SEND_PREVIEW_TIMEOUT = 250;

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
  const sendPreviewTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return store.sub(composeAtom, () => {
      window.clearTimeout(sendPreviewTimeoutRef.current);
      sendPreviewTimeoutRef.current = window.setTimeout(() => {
        const compose = store.get(composeAtom);
        if (!compose) return;
        if (isCompositionRef.current) return;

        const { inGame, isAction, source, previewId } = compose;
        const preview: PreviewPost = {
          id: previewId || makeId(),
          channelId,
          name: 'koppa',
          mediaId: null,
          inGame,
          isAction,
          text: source,
          clear: false,
          entities: [],
          editFor: null,
        };
        const clientEvent: ClientEvent = { type: 'PREVIEW', preview };
        const connection = getConnection();
        if (connection) {
          connection.send(JSON.stringify(clientEvent));
        }
      }, SEND_PREVIEW_TIMEOUT);
    });
  }, [channelId, composeAtom]);

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
