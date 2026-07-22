import { useCallback } from 'react';
import { showFlash } from '../../../actions';
import { type AppError, FETCH_FAIL, UNEXPECTED } from '../../../api/error';
import { type EditMessage, type Message, type NewMessage } from '../../../api/messages';
import { type AppResult, patch, post } from '../../../api/request';
import { useChannelId } from '../../../hooks/useChannelId';
import { parse } from '../../../interpreter/parser';
import store from '../../../store';
import { throwErr } from '../../../utils/errors';
import { getDiceFace } from '../../../utils/game';
import { newId } from '../../../utils/id';
import { SendTimeoutError, uploadMedia, withTimeout } from './helper';

const MEDIA_UPLOAD_TIMEOUT_MS = 60_000;
const MESSAGE_REQUEST_TIMEOUT_MS = 30_000;

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

const unexpectedSendError = (error: unknown): AppError => {
  if (error instanceof SendTimeoutError) {
    return {
      code: FETCH_FAIL,
      message: error.message,
      context: null,
    };
  }
  console.error('Unexpected error while sending a message', error);
  return {
    code: UNEXPECTED,
    message: error instanceof Error ? error.message : 'Unknown error',
    context: null,
  };
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
    const { compose } = channel;
    if (compose.sending) {
      return;
    }
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
      return;
    }

    dispatch({ type: 'COMPOSE_SENDING', pane: channelId });
    const sendFailed = (error: AppError) => {
      dispatch({ type: edit ? 'COMPOSE_EDIT_FAILED' : 'COMPOSE_SEND_FAILED', pane: channelId });
      throwErr(dispatch)(error);
    };

    try {
      const uploaded = await withTimeout(
        uploadMedia(media),
        MEDIA_UPLOAD_TIMEOUT_MS,
        'Media upload',
      );
      if (!uploaded.isOk) {
        sendFailed(uploaded.value);
        return;
      }
      const mediaId = uploaded.value;
      const chatDiceType = channel.channel.defaultDiceType;
      const defaultDiceFace = chatDiceType ? getDiceFace(chatDiceType) : 20;
      const { text, entities } = parse(source, true, {
        resolveUsername: () => null,
        defaultDiceFace,
      });

      let result: AppResult<Message>;
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
        result = await withTimeout(
          patch('/messages/edit', editPayload),
          MESSAGE_REQUEST_TIMEOUT_MS,
          'Message edit',
        );
      } else {
        const newMessage: NewMessage = {
          previewId: messageId,
          channelId,
          spaceId: channel.channel.spaceId,
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
        result = await withTimeout(
          post('/messages/send', newMessage),
          MESSAGE_REQUEST_TIMEOUT_MS,
          'Message send',
        );
      }

      if (result.isOk) {
        dispatch({ type: 'RESET_COMPOSE_AFTER_SENT', newId: newId(), pane: channelId });
      } else {
        sendFailed(result.value);
      }
    } catch (error) {
      sendFailed(unexpectedSendError(error));
    }
  }, [channelId]);
};
