import { useChannelId } from '../../../hooks/useChannelId';
import { useSend } from '../../../hooks/useSend';
import { useAtomValue } from 'jotai/utils';
import {
  broadcastAtom,
  editForAtom,
  inGameAtom,
  inputNameAtom,
  isActionAtom,
  messageIdAtom,
  sourceAtom,
  whisperToAtom,
} from './state';
import { useEffect, useRef } from 'react';
import { useParse } from '../../../hooks/useParse';
import { PreviewPost } from '../../../api/events';
import { useSelector } from '../../../store';

export const useSendPreview = () => {
  const channelId = useChannelId();
  const send = useSend();
  const initialized = useSelector((state) => state.chatStates.get(channelId)?.initialized ?? false);
  const parse = useParse();
  const source = useAtomValue(sourceAtom, channelId);
  const whisperTo = useAtomValue(whisperToAtom, channelId);
  const broadcast = useAtomValue(broadcastAtom, channelId);
  const inGame = useAtomValue(inGameAtom, channelId);
  const id = useAtomValue(messageIdAtom, channelId);
  const editFor = useAtomValue(editForAtom, channelId);
  const isAction = useAtomValue(isActionAtom, channelId);
  const inputName = useAtomValue(inputNameAtom, channelId);
  const nickname = useSelector((state) => state.profile?.user.nickname)!;
  const myMember = useSelector((state) => state.profile?.channels.get(channelId)?.member)!;

  useEffect(() => {
    if (!initialized) {
      return;
    }
    const handle = window.setTimeout(async () => {
      let name = nickname;
      if (inGame) {
        if (inputName) {
          name = inputName;
        } else {
          name = myMember.characterName;
        }
      }
      const preview: PreviewPost = {
        name,
        inGame,
        id,
        isAction,
        mediaId: null,
        editFor,
        clear: false,
        channelId,
        text: '',
        entities: [],
      };
      if (!broadcast || whisperTo) {
        preview.text = null;
      } else {
        const { text, entities } = parse(source);
        preview.text = text;
        preview.entities = entities;
      }
      console.log(preview);
      send({ type: 'PREVIEW', preview });
    }, 200);
    return () => window.clearTimeout(handle);
  }, [
    broadcast,
    channelId,
    id,
    inGame,
    initialized,
    inputName,
    isAction,
    myMember.characterName,
    nickname,
    parse,
    send,
    source,
    whisperTo,
  ]);
};
