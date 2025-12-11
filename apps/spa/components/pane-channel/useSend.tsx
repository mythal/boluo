import { type NewMessage, type EditMessage, type MemberWithUser } from '@boluo/api';
import { patch, post } from '@boluo/api-browser';
import { useStore } from 'jotai';
import { useCallback, useMemo, useRef } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useChannelId } from '../../hooks/useChannelId';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import { parse } from '@boluo/interpreter';
import { upload } from '../../media';
import { type ComposeActionUnion } from '../../state/compose.actions';
import { useDefaultInGame } from '../../hooks/useDefaultInGame';
import { recordWarn } from '../../error';
import { type ChatActionUnion } from '../../state/chat.actions';
import { chatAtom } from '../../state/chat.atoms';
import { timeout } from '@boluo/utils/async';
import { type FailTo } from '../../state/channel.types';
import { useIntl } from 'react-intl';
import { useSetBanner } from '../../hooks/useBanner';
import { useMember } from '../../hooks/useMember';

const SEND_TIMEOUT = 8000;

export const useSend = () => {
  const channelId = useChannelId();
  const defaultInGame = useDefaultInGame();
  const intl = useIntl();
  const { composeAtom, parsedAtom, checkComposeAtom, defaultDiceFaceRef } = useChannelAtoms();
  const store = useStore();

  const { data: queryChannelMembers } = useQueryChannelMembers(channelId);
  const myMember = useMember();
  const channelMembersMap: Map<string, MemberWithUser> = useMemo(() => {
    if (queryChannelMembers == null) return new Map<string, MemberWithUser>();
    return new Map(queryChannelMembers.members.map((member) => [member.user.username, member]));
  }, [queryChannelMembers]);
  const channelMembersMapRef = useRef(channelMembersMap);
  channelMembersMapRef.current = channelMembersMap;

  const setBanner = useSetBanner();

  const send = useCallback(async () => {
    const sendStartTime = Date.now();
    if (myMember == null) {
      recordWarn('Can not find current user in channel');
      setBanner({
        level: 'ERROR',
        content: intl.formatMessage({
          defaultMessage: 'Can not send message, please check if you are in the channel.',
        }),
      });
      return;
    }
    const nickname = myMember.user.nickname;
    const composeState = store.get(composeAtom);
    const parsedPreview = store.get(parsedAtom);
    if (store.get(checkComposeAtom) != null) return;
    const composeDispatch = (action: ComposeActionUnion) => store.set(composeAtom, action);
    const chatDispatch = (action: ChatActionUnion) => store.set(chatAtom, action);
    composeDispatch({ type: 'sent', payload: { edit: composeState.edit != null } });
    const parsedForSend = parse(composeState.source, true, {
      defaultDiceFace: defaultDiceFaceRef.current,
      resolveUsername: (username) => {
        const member = channelMembersMapRef.current.get(username);
        if (member == null) return null;
        return member.user.nickname;
      },
    });
    const { text, entities, whisperToUsernames, characterName: parsedCharacterNameForSend } =
      parsedForSend;
    let name = nickname;
    const effectiveCharacterName =
      (parsedCharacterNameForSend || parsedPreview.characterName).trim();
    const parsedInGame = parsedPreview.inGame ?? parsedForSend.inGame ?? null;
    const inGame = effectiveCharacterName ? true : parsedInGame ?? defaultInGame;
    if (inGame) {
      if (effectiveCharacterName !== '') {
        name = effectiveCharacterName;
      } else {
        name = myMember.channel.characterName;
      }
    }
    let payload:
      | { type: 'NEW'; newMessage: NewMessage }
      | { type: 'EDIT'; editMessage: EditMessage };
    if (composeState.edit == null) {
      const usernameListToUserIdList = (usernames: string[]): string[] => {
        if (channelMembersMapRef.current.size === 0 || usernames.length === 0) {
          return [];
        }
        return usernames.flatMap((username) => {
          const member = channelMembersMapRef.current.get(username);
          if (member == null) return [];
          return [member.user.id];
        });
      };
      payload = {
        type: 'NEW',
        newMessage: {
          messageId: null,
          previewId: composeState.previewId,
          channelId,
          name,
          text,
          entities,
          inGame,
          isAction: parsedPreview.isAction,
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
          media: composeState.media instanceof File ? composeState.media : null,
          composeState,
        },
      });
    } else {
      payload = {
        type: 'EDIT',
        editMessage: {
          // In edit mode, the `compose.previewId` is the message id.
          messageId: composeState.previewId,
          name,
          text,
          entities,
          inGame,
          isAction: parsedPreview.isAction,
          mediaId: typeof composeState.media === 'string' ? composeState.media : null,
          color: '',
        },
      };
      chatDispatch({
        type: 'messageEditing',
        payload: {
          editMessage: payload.editMessage,
          sendTime: sendStartTime,
          media: composeState.media instanceof File ? composeState.media : null,
          composeState,
        },
      });
    }

    let uploadResult: Awaited<ReturnType<typeof upload>> | null = null;
    if (composeState.media instanceof File) {
      uploadResult = await upload(composeState.media);
    }
    if (uploadResult?.isOk === false) {
      let key: string;
      let failTo: FailTo;
      if (payload.type === 'NEW') {
        key = composeState.previewId;
        failTo = { type: 'SEND', onUpload: uploadResult.err };
      } else {
        key = payload.editMessage.messageId;
        failTo = { type: 'EDIT', onUpload: uploadResult.err };
      }
      chatDispatch({ type: 'fail', payload: { failTo, key } });
      return;
    }
    const mediaId = uploadResult?.isOk ? uploadResult.some.mediaId : null;
    if (payload.type === 'EDIT') {
      if (mediaId) {
        payload.editMessage.mediaId = mediaId;
        chatDispatch({
          type: 'messageEditing',
          payload: {
            editMessage: payload.editMessage,
            sendTime: sendStartTime,
            media: null,
            composeState,
          },
        });
      }
      const result = await Promise.race([
        patch('/messages/edit', null, payload.editMessage),
        timeout(SEND_TIMEOUT),
      ]);
      if (result === 'TIMEOUT' || !result.isOk) {
        chatDispatch({
          type: 'fail',
          payload: {
            failTo: { type: 'EDIT' },
            key: payload.editMessage.messageId,
          },
        });
      }
    } else {
      if (mediaId) {
        payload.newMessage.mediaId = mediaId;
        chatDispatch({
          type: 'messageSending',
          payload: {
            newMessage: payload.newMessage,
            sendTime: sendStartTime,
            media: null,
            composeState,
          },
        });
      }
      const result = await Promise.race([
        post('/messages/send', null, payload.newMessage),
        timeout(SEND_TIMEOUT),
      ]);
      if ((result === 'TIMEOUT' || !result.isOk) && payload.newMessage.previewId) {
        chatDispatch({
          type: 'fail',
          payload: {
            failTo: { type: 'SEND' },
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
    setBanner,
    intl,
    channelId,
  ]);

  return send;
};
