import React, { useCallback } from 'react';
import { showFlash } from '../../../actions';
import { type EditMessage, type Message, type NewMessage } from '../../../api/messages';
import { type AppResult, patch, post } from '../../../api/request';
import Button from '../../../components/atoms/Button';
import { useChannelId } from '../../../hooks/useChannelId';
import { parse } from '../../../interpreter/parser';
import { type Compose } from '../../../reducers/chatState';
import store, { type Dispatch } from '../../../store';
import { throwErr } from '../../../utils/errors';
import { getDiceFace } from '../../../utils/game';
import { type Id, newId } from '../../../utils/id';
import { uploadMedia } from './helper';

export const whyCannotSend = (
  inGame: boolean,
  characterName: string,
  source: string,
): null | string => {
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
      消息发送可能失败了，恢复之前的文本吗？{' '}
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
    10000,
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
    const { inputName, inGame, source, media, messageId, edit, whisperTo, isAction } = compose;
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
    if (reason != null) {
      showFlash('ERROR', reason)(dispatch);
    }
    if (!edit) {
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
    if (edit) {
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
      previewId: messageId,
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
    let showFailed = false;
    const handle = window.setTimeout(() => {
      onSendFailed(pane, compose, dispatch);
      showFailed = true;
    }, 2000);
    try {
      sent = await post('/messages/send', newMessage);
      window.clearTimeout(handle);
    } catch {
      onSendFailed(pane, compose, dispatch);
      return;
    }
    if (!sent.isOk && !showFailed) {
      onSendFailed(pane, compose, dispatch);
    }
  }, [channelId]);
};
