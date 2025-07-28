import { type NewMessage, type User, type EditMessage, JsonValue } from '@boluo/api';
import { patch, post } from '@boluo/api-browser';
import { useStore } from 'jotai';
import { useCallback, useMemo, useRef } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useChannelId } from '../../hooks/useChannelId';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import { parse } from '../../interpreter/parser';
import { upload } from '../../media';
import { type ComposeActionUnion } from '../../state/compose.actions';
import { useDefaultInGame } from '../../hooks/useDefaultInGame';
import { recordWarn } from '../../error';
import { type ChatActionUnion } from '../../state/chat.actions';
import { chatAtom } from '../../state/chat.atoms';
import { timeout } from '@boluo/utils';
import { type FailTo } from '../../state/channel.types';

export const useSend = (me: User) => {
  const channelId = useChannelId();
  const defaultInGame = useDefaultInGame();
  const { composeAtom, parsedAtom, checkComposeAtom, defaultDiceFaceRef } = useChannelAtoms();
  const store = useStore();
  const { data: queryChannelMembers } = useQueryChannelMembers(channelId);
  const queryChannelMembersRef = useRef(queryChannelMembers);
  queryChannelMembersRef.current = queryChannelMembers;
  const { nickname } = me;
  const myMember = useMemo(() => {
    if (queryChannelMembers == null) return null;
    return queryChannelMembers.members.find((member) => member.user.id === me.id) ?? null;
  }, [me.id, queryChannelMembers]);

  const usernameListToUserIdList = useCallback((usernames: string[]): string[] => {
    const queryChannelMembers = queryChannelMembersRef.current;
    if (queryChannelMembers == null) return [];
    return usernames.flatMap((username) => {
      const member = queryChannelMembers.members.find(
        (member) => member.user.username === username,
      );
      if (member == null) return [];
      return [member.user.id];
    });
  }, []);

  const send = useCallback(async () => {
    const sendStartTime = Date.now();
    if (myMember == null) {
      recordWarn('Cannot find my channel member');
      return;
    }
    const compose = store.get(composeAtom);
    const parsed = store.get(parsedAtom);
    if (store.get(checkComposeAtom) != null) return;
    const dispatch = (action: ComposeActionUnion) => store.set(composeAtom, action);
    const chatDispatch = (action: ChatActionUnion) => store.set(chatAtom, action);
    const isEditing = compose.edit != null;
    dispatch({ type: 'sent', payload: { edit: isEditing } });
    const { text, entities, whisperToUsernames } = parse(compose.source, true, {
      defaultDiceFace: defaultDiceFaceRef.current,
      resolveUsername: (username) => null,
    });
    let name = nickname;
    const inGame = parsed.inGame ?? defaultInGame;
    if (inGame) {
      const inputedName = compose.inputedName.trim();
      if (inputedName === '') {
        name = myMember.channel.characterName;
      } else {
        name = inputedName;
      }
    }
    let payload:
      | { type: 'NEW'; newMessage: NewMessage }
      | { type: 'EDIT'; editMessage: EditMessage };
    if (!isEditing) {
      payload = {
        type: 'NEW',
        newMessage: {
          messageId: null,
          previewId: compose.previewId,
          channelId,
          name,
          text,
          entities,
          inGame,
          isAction: parsed.isAction,
          mediaId: null,
          pos: null,
          whisperToUsers: whisperToUsernames ? usernameListToUserIdList(whisperToUsernames) : null,
          color: '',
        },
      };
      chatDispatch({
        type: 'messageSending',
        payload: {
          newMessage: payload.newMessage,
          sendTime: sendStartTime,
          media: compose.media instanceof File ? compose.media : null,
        },
      });
    } else {
      payload = {
        type: 'EDIT',
        editMessage: {
          messageId: compose.previewId,
          name,
          text: parsed.text,
          entities: parsed.entities,
          inGame,
          isAction: parsed.isAction,
          mediaId: typeof compose.media === 'string' ? compose.media : null,
          color: '',
        },
      };
      chatDispatch({
        type: 'messageEditing',
        payload: {
          editMessage: payload.editMessage,
          sendTime: sendStartTime,
          media: compose.media instanceof File ? compose.media : null,
        },
      });
    }

    let uploadResult: Awaited<ReturnType<typeof upload>> | null = null;
    if (compose.media instanceof File) {
      uploadResult = await upload(compose.media);
    }
    if (uploadResult?.isOk === false) {
      let key: string;
      let failTo: FailTo;
      if (payload.type === 'NEW') {
        key = compose.previewId;
        failTo = { type: 'SEND', onUpload: true };
      } else {
        key = payload.editMessage.messageId;
        failTo = { type: 'EDIT', onUpload: true };
      }
      chatDispatch({ type: 'fail', payload: { failTo, key } });
      return;
    }
    const mediaId = uploadResult?.isOk ? uploadResult.some.mediaId : null;
    if (payload.type === 'EDIT') {
      if (mediaId) payload.editMessage.mediaId = mediaId;
      chatDispatch({
        type: 'messageEditing',
        payload: { editMessage: payload.editMessage, sendTime: sendStartTime, media: null },
      });
      const result = await Promise.race([
        patch('/messages/edit', null, payload.editMessage),
        timeout(8000),
      ]);
      if (result === 'TIMEOUT' || !result.isOk) {
        chatDispatch({
          type: 'fail',
          payload: { failTo: { type: 'EDIT' }, key: payload.editMessage.messageId },
        });
      }
    } else {
      if (mediaId) payload.newMessage.mediaId = mediaId;
      chatDispatch({
        type: 'messageSending',
        payload: { newMessage: payload.newMessage, sendTime: sendStartTime, media: null },
      });
      const result = await Promise.race([
        post('/messages/send', null, payload.newMessage),
        timeout(8000),
      ]);
      if ((result === 'TIMEOUT' || !result.isOk) && payload.newMessage.previewId) {
        chatDispatch({
          type: 'fail',
          payload: { failTo: { type: 'SEND' }, key: payload.newMessage.previewId },
        });
      }
    }
  }, [
    channelId,
    checkComposeAtom,
    composeAtom,
    defaultDiceFaceRef,
    defaultInGame,
    myMember,
    nickname,
    parsedAtom,
    store,
    usernameListToUserIdList,
  ]);

  return send;
};
