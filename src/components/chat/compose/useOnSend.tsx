import { useChannelId } from '../../../hooks/useChannelId';
import { useAtomCallback } from 'jotai/utils';
import { useCallback } from 'react';
import {
  editForAtom,
  inGameAtom,
  inputNameAtom,
  isActionAtom,
  mediaAtom,
  messageIdAtom,
  sendingAtom,
  sourceAtom,
  whisperToAtom,
} from './state';
import store from '../../../store';
import { showFlash } from '../../../actions/flash';
import { uploadMedia } from './helper';
import { getDiceFace } from '../../../utils/game';
import { parse } from '../../../interpreter/parser';
import { EditMessage, Message, NewMessage } from '../../../api/messages';
import { AppResult, patch, post } from '../../../api/request';
import { newId } from '../../../utils/id';
import { throwErr } from '../../../utils/errors';

export const whyCannotSend = (inGame: boolean, characterName: string, source: string): null | string => {
  if (inGame && characterName.trim().length === 0) {
    return '角色名不能为空';
  }
  if (source.trim().length === 0) {
    return '内容不能为空';
  }
  return null;
};
export const useOnSend = () => {
  const channelId = useChannelId();

  return useAtomCallback(
    useCallback(
      async (get, set) => {
        const inputName = get(inputNameAtom).trim();
        const source = get(sourceAtom);
        const inGame = get(inGameAtom);
        const state = store.getState();
        const profile = state.profile;
        if (!profile) {
          showFlash('ERROR', '错误，找不到用户信息')(store.dispatch);
          return;
        }
        const myMember = profile.channels.get(channelId)!.member;
        let name = profile.user.nickname;
        if (inGame) {
          if (inputName.length > 0) {
            name = inputName;
          } else {
            name = myMember.characterName;
          }
        }
        const reason = whyCannotSend(inGame, name, source);
        if (reason !== null) {
          showFlash('ERROR', reason)(store.dispatch);
        }
        set(sendingAtom, true);
        const media = get(mediaAtom);
        const mediaId = await uploadMedia(store.dispatch, media);
        const chatDiceType = state.chatStates.get(channelId)!.channel.defaultDiceType;
        const defaultDiceFace = chatDiceType ? getDiceFace(chatDiceType) : 20;
        const { text, entities } = parse(source, true, {
          resolveUsername: () => null,
          defaultDiceFace,
        });
        const messageId = get(messageIdAtom);
        const isAction = get(isActionAtom);
        if (get(editForAtom)) {
          const editPayload: EditMessage = {
            messageId,
            name,
            inGame,
            isAction,
            text,
            entities,
            mediaId,
          };
          const result: AppResult<Message> = await patch('/messages/edit', editPayload);
          set(sendingAtom, false);

          if (!result.isOk) {
            throwErr(store.dispatch)(result.value);
            return;
          }
          set(sourceAtom, '');
          set(editForAtom, null);
          set(mediaAtom, undefined);
          return;
        }
        const newMessage: NewMessage = {
          messageId,
          channelId,
          mediaId,
          name,
          inGame,
          isAction,
          text,
          entities,
        };

        const whisperTo = get(whisperToAtom);
        if (whisperTo) {
          newMessage.whisperToUsers = whisperTo.map((item) => item.value);
        }
        const resultPromise = post('/messages/send', newMessage);

        set(messageIdAtom, newId());
        const result = await resultPromise;
        set(sendingAtom, false);
        if (!result.isOk) {
          throwErr(store.dispatch)(result.value);
          return;
        } else {
          // reset
          set(isActionAtom, false);
          set(sourceAtom, '');
          set(mediaAtom, undefined);
        }
      },
      [channelId]
    ),
    channelId
  );
};
