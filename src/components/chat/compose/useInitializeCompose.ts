import store, { useSelector } from '../../../store';
import { Id } from '../../../utils/id';
import { useCallback, useEffect } from 'react';
import { useAtomCallback, useAtomValue } from 'jotai/utils';
import {
  broadcastAtom,
  editForAtom,
  inGameAtom,
  initializedAtom,
  inputNameAtom,
  messageIdAtom,
  sourceAtom,
} from './state';

export const useInitializeCompose = (channelId: Id) => {
  const initialized = useAtomValue(initializedAtom, channelId);
  const chatInitialized = useSelector((state) => state.chatStates.get(channelId)?.initialized ?? false);
  const callback = useAtomCallback(
    useCallback(
      (get, set) => {
        if (initialized || !chatInitialized) {
          return;
        }
        const state = store.getState();
        const chatState = state.chatStates.get(channelId);
        if (!(chatState && chatState.initialized)) {
          return;
        }
        const myId = state.profile?.channels.get(channelId)?.member.userId;
        if (!myId) {
          return;
        }
        const item = chatState.itemSet.previews.get(myId);
        if (!item) {
          set(initializedAtom, true);
          return;
        }
        const { preview } = item;
        if (preview.text === '' || preview.text === null) {
          set(initializedAtom, true);
          return;
        }
        if (preview.editFor) {
          set(messageIdAtom, preview.id);
          set(editForAtom, preview.editFor);
        }
        set(sourceAtom, preview.text);
        set(inGameAtom, preview.inGame);
        if (preview.inGame && preview.name) {
          set(inputNameAtom, preview.name);
        }
        set(initializedAtom, true);
        return;
      },
      [channelId, initialized, chatInitialized]
    ),
    channelId
  );
  useEffect(() => {
    callback();
  }, [callback]);
  return initialized;
};
