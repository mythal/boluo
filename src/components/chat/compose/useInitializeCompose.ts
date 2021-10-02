import { Preview } from '../../../api/events';
import store, { useSelector } from '../../../store';
import { Id } from '../../../utils/id';
import { useEffect, useLayoutEffect, useState } from 'react';
import { useUpdateAtom } from 'jotai/utils';
import { broadcastAtom, editForAtom, initializedAtom, inputNameAtom, messageIdAtom, sourceAtom } from './state';
import { useAtom } from 'jotai';
import { useAtomDevtools } from 'jotai/devtools';

export const useInitializeCompose = (channelId: Id) => {
  const initialized = useSelector((state) => state.chatStates.get(channelId)?.initialized ?? false);
  const myId = useSelector((state) => state.profile?.channels.get(channelId)?.member.userId);
  const setMessageId = useUpdateAtom(messageIdAtom, channelId);
  const setEditTimestamp = useUpdateAtom(editForAtom, channelId);
  const [, setSource] = useAtom(sourceAtom, channelId);
  useAtomDevtools(sourceAtom, 'source', channelId);
  const setBroadcast = useUpdateAtom(broadcastAtom, channelId);
  const setInputName = useUpdateAtom(inputNameAtom, channelId);
  const [composeInitialized, setComposeInitialized] = useAtom(initializedAtom, channelId);
  useEffect(() => {
    if (!initialized || !myId) {
      return;
    }
    const item = store.getState().chatStates.get(channelId)!.itemSet.previews.get(myId);
    if (!item) {
      setComposeInitialized(true);
      return;
    }
    const { preview } = item;
    if (preview.text === '') {
      setComposeInitialized(true);
      return;
    }
    if (preview.editFor) {
      setMessageId(preview.id);
      setEditTimestamp(preview.editFor);
    }
    if (preview.text) {
      setSource(preview.text);
    } else {
      setBroadcast(false);
    }
    if (preview.name) {
      setInputName(preview.name);
    }
    setComposeInitialized(true);
  }, [
    channelId,
    initialized,
    myId,
    setBroadcast,
    setComposeInitialized,
    setEditTimestamp,
    setInputName,
    setMessageId,
    setSource,
  ]);
  return composeInitialized;
};
