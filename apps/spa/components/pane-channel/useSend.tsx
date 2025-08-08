import { type NewMessage, type EditMessage, type MemberWithUser } from '@boluo/api';
import { patch, post } from '@boluo/api-browser';
import { useStore } from 'jotai';
import { useCallback, useMemo } from 'react';
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
import { useIntl } from 'react-intl';

const SEND_TIMEOUT = 8000;

export const useSend = () => {
  const channelId = useChannelId();
  const defaultInGame = useDefaultInGame();
  const intl = useIntl();
  const { composeAtom, parsedAtom, checkComposeAtom, defaultDiceFaceRef } = useChannelAtoms();
  const store = useStore();

  const { data: queryChannelMembers } = useQueryChannelMembers(channelId);
  const myMember = useMemo(() => {
    if (queryChannelMembers == null) return null;
    if (queryChannelMembers.selfIndex == null) return null;
    return queryChannelMembers.members[queryChannelMembers.selfIndex] ?? null;
  }, [queryChannelMembers]);
  const channelMembersMap: Map<string, MemberWithUser> = useMemo(() => {
    if (queryChannelMembers == null) return new Map();
    return new Map(queryChannelMembers.members.map((member) => [member.user.username, member]));
  }, [queryChannelMembers]);

  const send = useCallback(async () => {
    const sendStartTime = Date.now();
    if (myMember == null) {
      recordWarn('Can not find current user in channel');
      alert(
        intl.formatMessage({
          defaultMessage: 'Can not send message, please check if you are in the channel.',
        }),
      );
      return;
    }
    const nickname = myMember.user.nickname;
    const compose = store.get(composeAtom);
    const parsed = store.get(parsedAtom);
    if (store.get(checkComposeAtom) != null) return;
    const composeDispatch = (action: ComposeActionUnion) => store.set(composeAtom, action);
    const chatDispatch = (action: ChatActionUnion) => store.set(chatAtom, action);
    composeDispatch({ type: 'sent', payload: { edit: compose.edit != null } });
    const { text, entities, whisperToUsernames } = parse(compose.source, true, {
      defaultDiceFace: defaultDiceFaceRef.current,
      resolveUsername: (username) => {
        const member = channelMembersMap.get(username);
        if (member == null) return null;
        return member.user.nickname;
      },
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
    if (compose.edit == null) {
      const usernameListToUserIdList = (usernames: string[]): string[] => {
        if (channelMembersMap.size === 0 || usernames.length === 0) {
          return [];
        }
        return usernames.flatMap((username) => {
          const member = channelMembersMap.get(username);
          if (member == null) return [];
          return [member.user.id];
        });
      };
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
          whisperToUsers: whisperToUsernames
            ? usernameListToUserIdList(whisperToUsernames)
            : undefined,
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
          // In edit mode, the `compose.previewId` is the message id.
          messageId: compose.previewId,
          name,
          text,
          entities,
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
        failTo = { type: 'SEND', onUpload: true, composeState: compose };
      } else {
        key = payload.editMessage.messageId;
        failTo = { type: 'EDIT', onUpload: true, composeState: compose };
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
        timeout(SEND_TIMEOUT),
      ]);
      if (result === 'TIMEOUT' || !result.isOk) {
        chatDispatch({
          type: 'fail',
          payload: {
            failTo: { type: 'EDIT', composeState: compose },
            key: payload.editMessage.messageId,
          },
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
        timeout(SEND_TIMEOUT),
      ]);
      if ((result === 'TIMEOUT' || !result.isOk) && payload.newMessage.previewId) {
        chatDispatch({
          type: 'fail',
          payload: {
            failTo: { type: 'SEND', composeState: compose },
            key: payload.newMessage.previewId,
          },
        });
      }
    }
  }, [
    myMember,
    store,
    composeAtom,
    parsedAtom,
    checkComposeAtom,
    defaultDiceFaceRef,
    defaultInGame,
    intl,
    channelMembersMap,
    channelId,
  ]);

  return send;
};
