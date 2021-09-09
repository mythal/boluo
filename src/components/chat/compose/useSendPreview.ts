import { useChannelId } from '../../../hooks/useChannelId';
import { useSend } from '../../../hooks/useSend';
import { useAtomCallback, useAtomValue } from 'jotai/utils';
import {
  broadcastAtom,
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
  const parse = useParse();
  const source = useAtomValue(sourceAtom, channelId);
  const whisperTo = useAtomValue(whisperToAtom, channelId);
  const broadcast = useAtomValue(broadcastAtom, channelId);
  const inGame = useAtomValue(inGameAtom, channelId);
  const id = useAtomValue(messageIdAtom, channelId);
  const isAction = useAtomValue(isActionAtom, channelId);
  const inputName = useAtomValue(inputNameAtom, channelId);
  const submitHandle = useRef<number | undefined>(undefined);
  const nickname = useSelector((state) => state.profile?.user.nickname)!;
  const myMember = useSelector((state) => state.profile?.channels.get(channelId)?.member)!;

  useEffect(() => {
    submitHandle.current = window.setTimeout(async () => {
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
        editFor: null,
        clear: false,
        channelId,
        text: '',
        entities: [],
      };
      if (!whisperTo && broadcast) {
        const { text, entities } = parse(source);
        preview.text = text;
        preview.entities = entities;
      }
      send({ type: 'PREVIEW', preview });
    }, 100);
    return () => window.clearTimeout(submitHandle.current);
  }, [
    broadcast,
    channelId,
    id,
    inGame,
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
