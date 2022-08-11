import { useChannelId } from '../../../hooks/useChannelId';
import React, { useCallback } from 'react';
import store, { Dispatch } from '../../../store';
import { uploadMedia } from './helper';
import { getDiceFace } from '../../../utils/game';
import { parse } from '../../../interpreter/parser';
import { EditMessage, Message, NewMessage } from '../../../api/messages';
import { AppResult, patch, post } from '../../../api/request';
import { Id, newId } from '../../../utils/id';
import { throwErr } from '../../../utils/errors';
import { showFlash } from '../../../actions';
import Button from '../../../components/atoms/Button';
import { Compose } from '../../../reducers/chatState';

export const whyCannotSend = (inGame: boolean, characterName: string, source: string): null | string => {
  if (inGame && characterName.trim().length === 0) {
    return '角色名不能为空';
  }
  if (source.trim().length === 0) {
    return '内容不能为空';
  }
  return null;
};

const onSendFailed = (pane: Id, compose: Compose, dispatch: Dispatch) => {
  showFlash(
    'ERROR',
    <span>
      消息发送失败，恢复之前的文本吗？{' '}
      <Button
        data-size="small"
        data-variant="primary"
        onClick={() => {
          dispatch({ type: 'RESTORE_COMPOSE_STATE', compose, pane });
        }}
      >
        恢复
      </Button>
    </span>,
    10000
  )(dispatch);
};
export const useOnSend = () => {
  const channelId = useChannelId();
  return useCallback(async () => {
    const pane = channelId;
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
    const { compose } = channel;
    const { inputName, inGame, source, media, messageId, editFor, whisperTo, isAction } = compose;
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
    if (!editFor) {
      dispatch({ type: 'RESET_COMPOSE_AFTER_SENT', newId: newId(), pane: channelId });
    }
    const mediaId = await uploadMedia(store.dispatch, media);
    if (media && !mediaId) {
      onSendFailed(pane, compose, dispatch);
      return;
    }
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
    let sent: AppResult<Message>;
    try {
      sent = await post('/messages/send', newMessage);
    } catch {
      onSendFailed(pane, compose, dispatch);
      return;
    }
    if (!sent.isOk) {
      onSendFailed(pane, compose, dispatch);
    }
  }, [channelId]);
};
