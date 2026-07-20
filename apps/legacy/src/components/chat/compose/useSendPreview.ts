import { useEffect, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { subscribePreviewAcknowledgement } from '@boluo/api/preview/ack';
import { isClearedPreviewContent } from '@boluo/api/preview/diff';
import { createPreviewPublisher } from '@boluo/api/preview/publisher';
import { type PreviewPost } from '../../../api/events';
import { useChannelId } from '../../../hooks/useChannelId';
import { useParse } from '../../../hooks/useParse';
import { connectionStateAtom } from '../../../states/connection';
import { useSelector } from '../../../store';

const SEND_PREVIEW_DEBOUNCE_MS = 200;

export const useSendPreview = () => {
  const channelId = useChannelId();
  const connection = useSelector((state) => state.ui.connection);
  const connectionState = useAtomValue(connectionStateAtom);
  const initialized = useSelector((state) => state.chatStates.get(channelId)?.initialized ?? false);
  const parse = useParse();
  const compose = useSelector((state) => state.chatStates.get(channelId)!.compose);
  const { source, whisperTo, broadcast, inGame, messageId, edit, inputName, isAction } = compose;
  const nickname = useSelector((state) => state.profile?.user.nickname)!;
  const myMember = useSelector((state) => state.profile?.channels.get(channelId)?.member)!;
  const publisher = useMemo(
    () =>
      createPreviewPublisher<WebSocket, number>({
        debounceMs: SEND_PREVIEW_DEBOUNCE_MS,
        now: Date.now,
        send: (currentConnection, event) => {
          if (currentConnection.readyState !== WebSocket.OPEN) return false;
          currentConnection.send(JSON.stringify(event));
          return true;
        },
        setTimer: (callback, delay) => window.setTimeout(callback, delay),
        clearTimer: (handle) => window.clearTimeout(handle),
        requestReconnect: (currentConnection, code, reason) => {
          if (currentConnection.readyState === WebSocket.OPEN) {
            currentConnection.close(code, reason);
          }
        },
      }),
    [],
  );

  useEffect(() => {
    publisher.activate();
    return () => publisher.dispose();
  }, [publisher]);

  useEffect(() => {
    return subscribePreviewAcknowledgement(({ source, acknowledgement }) => {
      publisher.dispatch({
        type: 'ACKNOWLEDGEMENT_RECEIVED',
        source,
        acknowledgement,
      });
    });
  }, [publisher]);

  useEffect(() => {
    publisher.dispatch({
      type: 'CONNECTION_STATE_CHANGED',
      connection: connectionState === 'OPEN' && connection != null ? connection : null,
      initialized,
    });
  }, [connection, connectionState, initialized, publisher]);

  useEffect(() => {
    const updateEnabled = () => {
      publisher.dispatch({
        type: 'ENABLED_CHANGED',
        enabled: document.hasFocus(),
      });
    };
    updateEnabled();
    window.addEventListener('focus', updateEnabled);
    window.addEventListener('blur', updateEnabled);
    return () => {
      window.removeEventListener('focus', updateEnabled);
      window.removeEventListener('blur', updateEnabled);
    };
  }, [publisher]);

  useEffect(() => {
    let name = nickname;
    if (inGame) {
      name = inputName || myMember.characterName;
    }
    const preview: PreviewPost = {
      name,
      inGame,
      id: messageId,
      isAction,
      mediaId: null,
      edit,
      clear: false,
      channelId,
      text: '',
      entities: [],
    };
    if (!broadcast && source.trim() === '') {
      // Clear preview.
    } else if (!broadcast || whisperTo) {
      preview.text = null;
    } else {
      const { text, entities } = parse(source);
      preview.text = text;
      preview.entities = entities;
    }
    if (isClearedPreviewContent(preview)) {
      preview.text = '';
      preview.entities = [];
    }
    publisher.dispatch({
      type: 'DESIRED_PREVIEW_CHANGED',
      desired: { preview },
    });
  }, [
    broadcast,
    channelId,
    edit,
    inGame,
    inputName,
    isAction,
    messageId,
    myMember.characterName,
    nickname,
    parse,
    publisher,
    source,
    whisperTo,
  ]);
};
