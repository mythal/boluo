import { ClientEvent, PreviewPost } from 'api';
import { useAtomValue, useStore } from 'jotai';
import { MutableRefObject, useEffect, useRef } from 'react';
import { makeId } from 'utils';
import { ComposeAtom } from '../../hooks/useComposeAtom';
import { connectionStateAtom } from '../../state/atoms/chat';
import { useIsFocused } from '../../state/chat-view';
import { ComposeState } from '../../state/compose';

const SEND_PREVIEW_TIMEOUT_MS = 250;
const isVaildName = (name: string) => {
  return name.trim().length > 0;
};

const sendPreview = (
  channelId: string,
  nickname: string,
  compose: ComposeState,
  connection: WebSocket,
  sendTimeoutRef: MutableRefObject<number | undefined>,
): void => {
  window.clearTimeout(sendTimeoutRef.current);

  sendTimeoutRef.current = window.setTimeout(() => {
    const { inGame, isAction, source, previewId, inputedName } = compose;
    const inGameName = inputedName || '';
    if (!previewId) {
      return;
    }
    const preview: PreviewPost = {
      id: previewId || makeId(),
      channelId,
      name: inGame ? inGameName : nickname,
      mediaId: null,
      inGame,
      isAction,
      text: source,
      clear: false,
      entities: [],
      editFor: null,
    };

    const clientEvent: ClientEvent = { type: 'PREVIEW', preview };
    connection.send(JSON.stringify(clientEvent));
  }, SEND_PREVIEW_TIMEOUT_MS);
};

export const useSendPreview = (channelId: string, nickname: string | undefined, composeAtom: ComposeAtom) => {
  const store = useStore();
  const sendTimoutRef = useRef<number | undefined>(undefined);
  const isFocused = useIsFocused();
  const connectionState = useAtomValue(connectionStateAtom);
  useEffect(() => {
    return store.sub(composeAtom, () => {
      if (nickname === undefined || connectionState.type !== 'CONNECTED') {
        return;
      }
      if (!isFocused) {
        return;
      }
      const composeState = store.get(composeAtom);
      sendPreview(channelId, nickname, composeState, connectionState.connection, sendTimoutRef);
    });
  }, [channelId, composeAtom, connectionState, isFocused, nickname, store]);
};