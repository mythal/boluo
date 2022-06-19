import { useChannelId } from '../../../hooks/useChannelId';
import { useCallback } from 'react';
import store from '../../../store';
import { uploadMedia } from './helper';
import { getDiceFace } from '../../../utils/game';
import { parse } from '../../../interpreter/parser';
import { EditMessage, Message, NewMessage } from '../../../api/messages';
import { AppResult, patch, post } from '../../../api/request';
import { newId } from '../../../utils/id';
import { throwErr } from '../../../utils/errors';
import { showFlash } from '../../../actions';

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
  return useCallback(async () => {
    const state = store.getState();
    const dispatch = store.dispatch;
    const channel = state.chatStates.get(channelId);
    if (!channel) {
      throw new Error('invalid channel id');
    }
    const { profile } = state;
    if (!profile) {
      return;
    }
    const { inputName, inGame, source, media, messageId, editFor, whisperTo, isAction } = channel.compose;
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
      showFlash('ERROR', reason)(dispatch);
    }
    dispatch({ type: 'COMPOSE_SENDING', pane: channelId });
    const mediaId = await uploadMedia(store.dispatch, media);
    const chatDiceType = channel.channel.defaultDiceType;
    const defaultDiceFace = chatDiceType ? getDiceFace(chatDiceType) : 20;

    const { text, entities } = parse(source, true, {
      resolveUsername: () => null,
      defaultDiceFace,
    });
    if (editFor) {
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
      if (!result.isOk) {
        dispatch({ type: 'COMPOSE_EDIT_FAILED', pane: channelId });
        throwErr(dispatch)(result.value);
        return;
      } else {
        dispatch({ type: 'RESET_COMPOSE_AFTER_SENT', newId: newId(), pane: channelId });
        return;
      }
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
    if (whisperTo) {
      newMessage.whisperToUsers = whisperTo.map((item) => item.value);
    }
    const resultPromise = post('/messages/send', newMessage);

    dispatch({ type: 'COMPOSE_SENT', pane: channelId });
    const result = await resultPromise;
    if (!result.isOk) {
      throwErr(store.dispatch)(result.value);
      dispatch({ type: 'COMPOSE_SEND_FAILED', pane: channelId });
      return;
    } else {
      dispatch({ type: 'RESET_COMPOSE_AFTER_SENT', newId: newId(), pane: channelId });
    }
  }, [channelId]);
};
