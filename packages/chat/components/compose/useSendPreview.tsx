import { ClientEvent, PreviewPost } from '@boluo/api';
import { Atom, useAtomValue, useStore } from 'jotai';
import { MutableRefObject, useEffect, useRef } from 'react';
import { makeId } from '@boluo/utils';
import { ComposeAtom } from '../../hooks/useComposeAtom';
import { usePaneIsFocus } from '../../hooks/usePaneIsFocus';
import { ParseResult } from '../../interpreter/parse-result';
import { connectionStateAtom } from '../../state/chat.atoms';
import { ComposeState } from '../../state/compose.reducer';

const SEND_PREVIEW_TIMEOUT_MS = 250;
const isVaildName = (name: string) => {
  return name.trim().length > 0;
};

const sendPreview = (
  channelId: string,
  nickname: string,
  characterName: string,
  compose: ComposeState,
  parsed: ParseResult,
  connection: WebSocket,
  sendTimeoutRef: MutableRefObject<number | undefined>,
): void => {
  window.clearTimeout(sendTimeoutRef.current);

  sendTimeoutRef.current = window.setTimeout(() => {
    const { defaultInGame: composeInGame, previewId, inputedName, editFor } = compose;
    const { isAction, broadcast, whisperToUsernames, inGame: parsedInGame } = parsed;
    const inGame = parsedInGame ?? composeInGame;
    const inGameName = inputedName || characterName;
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
      text: (broadcast && !whisperToUsernames) || parsed.text === '' ? parsed.text : null,
      clear: false,
      entities: broadcast && !whisperToUsernames ? parsed.entities : [],
      editFor,
    };

    const clientEvent: ClientEvent = { type: 'PREVIEW', preview };
    connection.send(JSON.stringify(clientEvent));
  }, SEND_PREVIEW_TIMEOUT_MS);
};

export const useSendPreview = (
  channelId: string,
  nickname: string | undefined,
  characterName: string,
  composeAtom: ComposeAtom,
  parsedAtom: Atom<ParseResult>,
) => {
  const store = useStore();
  const sendTimoutRef = useRef<number | undefined>(undefined);
  const isFocused = usePaneIsFocus();
  const connectionState = useAtomValue(connectionStateAtom);
  useEffect(() => {
    return store.sub(parsedAtom, () => {
      if (nickname === undefined || connectionState.type !== 'CONNECTED') {
        return;
      }
      if (!isFocused) {
        return;
      }
      const composeState = store.get(composeAtom);
      const parsed = store.get(parsedAtom);
      sendPreview(channelId, nickname, characterName, composeState, parsed, connectionState.connection, sendTimoutRef);
    });
  }, [channelId, characterName, composeAtom, connectionState, isFocused, nickname, parsedAtom, store]);
};
