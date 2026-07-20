import { subscribePreviewAcknowledgement } from '@boluo/api/preview/ack';
import { createPreviewPublisher } from '@boluo/api/preview/publisher';
import { makeId } from '@boluo/utils/id';
import { atom, type Atom, useAtomValue, useStore } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useEffect, useEffectEvent, useMemo } from 'react';
import { type ComposeParseResult } from '../../hooks/useChannelAtoms';
import { type ComposeAtom } from '../../hooks/useComposeAtom';
import { usePaneIsFocus } from '../../hooks/usePaneIsFocus';
import { chatAtom, connectionStateAtom, isChatInitializedAtom } from '../../state/chat.atoms';
import {
  areComposePreviewMetadataEqual,
  makeDesiredPreview,
  selectComposePreviewMetadata,
} from './makeDesiredPreview';

const SEND_PREVIEW_DEBOUNCE_MS = 250;

export const useSendPreview = (
  channelId: string,
  nickname: string | undefined,
  defaultCharacterName: string,
  composeAtom: ComposeAtom,
  parsedAtom: Atom<ComposeParseResult>,
  defaultInGame: boolean,
) => {
  const store = useStore();
  const isFocused = usePaneIsFocus();
  const connectionState = useAtomValue(connectionStateAtom);
  const initialized = useAtomValue(isChatInitializedAtom);
  const publisher = useMemo(
    () =>
      createPreviewPublisher<WebSocket, number>({
        debounceMs: SEND_PREVIEW_DEBOUNCE_MS,
        now: Date.now,
        send: (connection, event) => {
          if (connection.readyState !== WebSocket.OPEN) return false;
          connection.send(JSON.stringify(event));
          return true;
        },
        setTimer: (callback, delay) => window.setTimeout(callback, delay),
        clearTimer: (handle) => window.clearTimeout(handle),
        requestReconnect: (connection, code, reason) => {
          if (connection.readyState === WebSocket.OPEN) {
            connection.close(code, reason);
          }
        },
      }),
    [],
  );
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
  const previewMetadataAtom = useMemo(
    () => selectAtom(composeAtom, selectComposePreviewMetadata, areComposePreviewMetadataEqual),
    [composeAtom],
  );

  useEffect(() => {
    publisher.activate();
    return () => publisher.dispose();
  }, [publisher]);

  useEffect(() => {
    return store.sub(hasCollidedAtom, () => {
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

  const updateDesiredPreview = useEffectEvent(() => {
    if (nickname === undefined) return;
    const compose = store.get(composeAtom);
    const parsed = store.get(parsedAtom);
    const desired = makeDesiredPreview({
      channelId,
      nickname,
      defaultCharacterName,
      defaultInGame,
      compose,
      parsed,
    });
    if (desired == null) return;
    publisher.dispatch({
      type: 'DESIRED_PREVIEW_CHANGED',
      desired,
    });
  });

  useEffect(() => {
    updateDesiredPreview();
    const unsubscribeParsed = store.sub(parsedAtom, updateDesiredPreview);
    const unsubscribePreviewMetadata = store.sub(previewMetadataAtom, updateDesiredPreview);
    return () => {
      unsubscribeParsed();
      unsubscribePreviewMetadata();
    };
  }, [
    channelId,
    composeAtom,
    defaultCharacterName,
    defaultInGame,
    nickname,
    parsedAtom,
    previewMetadataAtom,
    publisher,
    store,
  ]);

  useEffect(() => {
    const connection = connectionState.type === 'CONNECTED' ? connectionState.connection : null;
    publisher.dispatch({
      type: 'CONNECTION_STATE_CHANGED',
      connection,
      initialized,
    });
  }, [connectionState, initialized, publisher]);

  useEffect(() => {
    const updateEnabled = () => {
      publisher.dispatch({
        type: 'ENABLED_CHANGED',
        enabled: nickname !== undefined && isFocused && document.hasFocus(),
      });
    };
    updateEnabled();
    window.addEventListener('focus', updateEnabled);
    window.addEventListener('blur', updateEnabled);
    return () => {
      window.removeEventListener('focus', updateEnabled);
      window.removeEventListener('blur', updateEnabled);
    };
  }, [isFocused, nickname, publisher]);

  useEffect(() => {
    return subscribePreviewAcknowledgement(({ source, acknowledgement }) => {
      publisher.dispatch({
        type: 'ACKNOWLEDGEMENT_RECEIVED',
        source,
        acknowledgement,
      });
    });
  }, [publisher]);
};
