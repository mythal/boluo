import { JsonValue, type ClientEvent, type PreviewPost } from '@boluo/api';
import { atom, type Atom, useAtomValue, useStore } from 'jotai';
import { type MutableRefObject, useEffect, useMemo, useRef } from 'react';
import { makeId } from '@boluo/utils';
import { type ComposeAtom } from '../../hooks/useComposeAtom';
import { usePaneIsFocus } from '../../hooks/usePaneIsFocus';
import { type ParseResult } from '../../interpreter/parse-result';
import { chatAtom, connectionStateAtom } from '../../state/chat.atoms';
import { type ComposeState } from '../../state/compose.reducer';

const SEND_PREVIEW_TIMEOUT_MS = 250;

const sendPreview = (
  channelId: string,
  nickname: string,
  characterName: string,
  compose: ComposeState,
  parsed: ParseResult,
  connection: WebSocket,
  sendTimeoutRef: MutableRefObject<number | undefined>,
  defaultInGame: boolean,
): void => {
  window.clearTimeout(sendTimeoutRef.current);

  sendTimeoutRef.current = window.setTimeout(() => {
    const { previewId, inputedName, edit } = compose;
    const { isAction, broadcast, whisperToUsernames, inGame: parsedInGame } = parsed;
    const inGame = parsedInGame ?? defaultInGame;
    const inGameName = inputedName || characterName;
    if (!previewId) return;
    const doNotBroadcast = !broadcast || whisperToUsernames !== null;
    const resetPreview = parsed.text === '' || parsed.entities.length === 0;
    const text: string | null = doNotBroadcast ? null : parsed.text;
    const preview: PreviewPost = {
      id: previewId || makeId(),
      channelId,
      name: inGame ? inGameName : nickname,
      mediaId: null,
      inGame,
      isAction,
      text: resetPreview ? '' : text,
      clear: false,
      entities: doNotBroadcast || resetPreview ? [] : parsed.entities,
      editFor: null,
      edit,
    };

    const clientEvent: ClientEvent = { type: 'PREVIEW', preview };
    if (connection.readyState !== WebSocket.OPEN) {
      return;
    }
    connection.send(JSON.stringify(clientEvent));
  }, SEND_PREVIEW_TIMEOUT_MS);
};

export const useSendPreview = (
  channelId: string,
  nickname: string | undefined,
  characterName: string,
  composeAtom: ComposeAtom,
  parsedAtom: Atom<ParseResult>,
  defaultInGame: boolean,
) => {
  const store = useStore();
  const sendTimoutRef = useRef<number | undefined>(undefined);
  const isFocused = usePaneIsFocus();
  const isFocusedRef = useRef(isFocused);
  const connectionState = useAtomValue(connectionStateAtom);
  const hasCollidedAtom = useMemo(
    () =>
      atom((read) => {
        const composeState = read(composeAtom);
        const chatState = read(chatAtom);
        const channelState = chatState.channels[channelId];
        if (channelState == null || !channelState.fullLoaded) return false;
        return channelState.collidedPreviewIdSet.has(composeState.previewId);
      }),
    [channelId, composeAtom],
  );
  useEffect(() => {
    store.sub(hasCollidedAtom, () => {
      const hasCollided = store.get(hasCollidedAtom);
      const previewId = store.get(composeAtom).previewId;
      if (hasCollided) {
        store.set(composeAtom, {
          type: 'collided',
          payload: { previewId, newPreviewId: makeId() },
        });
      }
    });
  }, [composeAtom, hasCollidedAtom, store]);
  useEffect(() => {
    return store.sub(parsedAtom, () => {
      const chatState = store.get(chatAtom);
      if (!chatState.context.initialized) return;
      if (nickname === undefined || connectionState.type !== 'CONNECTED') return;
      if (!isFocusedRef.current) return;
      if (!document.hasFocus()) return;
      const composeState = store.get(composeAtom);
      const parsed = store.get(parsedAtom);
      sendPreview(
        channelId,
        nickname,
        characterName,
        composeState,
        parsed,
        connectionState.connection,
        sendTimoutRef,
        defaultInGame,
      );
    });
  }, [
    channelId,
    characterName,
    composeAtom,
    connectionState,
    defaultInGame,
    nickname,
    parsedAtom,
    store,
  ]);
};
