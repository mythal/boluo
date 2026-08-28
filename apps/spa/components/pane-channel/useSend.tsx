import { type NewMessage, type EditMessage, type MemberWithUser } from '@boluo/api';
import { patch, post } from '@boluo/api-browser';
import { useStore } from 'jotai';
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useChannelId } from '../../hooks/useChannelId';
import { useQueryChannelMembers } from '@boluo/hooks/useQueryChannelMembers';
import { parse } from '@boluo/interpreter';
import { uploadMessageMedia } from '../../media';
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
import { findMessage } from '../../state/channel.reducer';
import { saveDraftInWorker } from '../../state/compose-backup.worker-client';
import { useChannelCharacterName } from '../../hooks/useChannelCharacter';
import { usePortrayableCharacters } from '../../hooks/usePortrayableCharacters';
import { selectedPortraitIdForCharacter } from '../../state/characterPortraitSelection';
import { resolveSpeaker } from '../../characters/resolveSpeaker';

const SEND_TIMEOUT = 8000;

export const useSend = () => {
  const channelId = useChannelId();
  const defaultInGame = useDefaultInGame();
  const intl = useIntl();
  const { composeAtom, checkComposeAtom, defaultDiceFaceRef } = useChannelAtoms();
  const store = useStore();

  const myMember = useMember();
  const channelCharacterName = useChannelCharacterName(myMember);
  const { resolve } = usePortrayableCharacters(myMember?.space.spaceId);
  const { data: queryChannelMembers } = useQueryChannelMembers(channelId, myMember?.space.spaceId);
  const channelMembersMap: Map<string, MemberWithUser> = useMemo(() => {
    if (queryChannelMembers == null) return new Map<string, MemberWithUser>();
    return new Map(queryChannelMembers.members.map((member) => [member.user.username, member]));
  }, [queryChannelMembers]);
  const channelMembersMapRef = useRef(channelMembersMap);
  useLayoutEffect(() => {
    channelMembersMapRef.current = channelMembersMap;
  });

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
    if (store.get(checkComposeAtom) != null) return;
    const composeDispatch = (action: ComposeActionUnion) => store.set(composeAtom, action);
    const chatDispatch = (action: ChatActionUnion) => store.set(chatAtom, action);

    if (composeState.edit != null) {
      const channelState = store.get(chatAtom).channels[channelId];
      const editPos = composeState.edit.p / composeState.edit.q;
      const found = channelState
        ? findMessage(channelState.messages, composeState.previewId, editPos)
        : null;
      if (!found) {
        if (composeState.source.trim() !== '') {
          saveDraftInWorker(channelId, composeState.source);
        }
        composeDispatch({ type: 'sent', payload: { edit: true } });
        setBanner({
          level: 'WARNING',
          content: intl.formatMessage({
            defaultMessage:
              'The message you were editing was deleted. Your edits have been saved as a draft.',
          }),
        });
        return;
      }
    }

    const parsedForSend = parse(composeState.source, true, {
      defaultDiceFace: defaultDiceFaceRef.current,
      resolveUsername: (username) => {
        const member = channelMembersMapRef.current.get(username);
        if (member == null) return null;
        return member.user.nickname;
      },
    });
    const { text, entities, whisperToUsernames } = parsedForSend;
    const speaker = resolveSpeaker({
      nickname,
      defaultInGame,
      parsedInGame: parsedForSend.inGame,
      asTarget: parsedForSend.asTarget,
      editingAttribution: composeState.editingAttribution,
      channelCharacterId: myMember.channel.characterId,
      channelCharacterName,
      resolveCharacter: resolve,
    });
    if (speaker.type === 'InvalidCharacterReference') {
      const content =
        speaker.reason === 'Loading'
          ? intl.formatMessage({
              defaultMessage: 'Characters are still loading. Please try again.',
            })
          : speaker.reason === 'Error'
            ? intl.formatMessage({ defaultMessage: 'Characters could not be loaded.' })
            : intl.formatMessage(
                {
                  defaultMessage:
                    'Character “@{identifier}” is unavailable or cannot be portrayed.',
                },
                { identifier: speaker.identifier },
              );
      setBanner({
        level: 'ERROR',
        content,
      });
      return;
    }
    const collapseCharacterReference =
      parsedForSend.asTarget?.type === 'CharacterReference' &&
      myMember.channel.characterId != null &&
      speaker.characterId === myMember.channel.characterId;
    composeDispatch({
      type: 'sent',
      payload: { edit: composeState.edit != null, collapseCharacterReference },
    });
    const composeStateAfterSent = store.get(composeAtom);
    const { inGame, name, characterId, color: speakerColor } = speaker;
    let payload:
      { type: 'NEW'; newMessage: NewMessage } | { type: 'EDIT'; editMessage: EditMessage };
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
          spaceId: myMember.space.spaceId,
          name,
          characterId,
          portraitId: selectedPortraitIdForCharacter(
            characterId,
            composeState.selectedCharacterPortrait,
          ),
          text,
          entities,
          inGame,
          isAction: parsedForSend.isAction,
          color: speakerColor,
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
          isAction: parsedForSend.isAction,
          mediaId: typeof composeState.media === 'string' ? composeState.media : null,
          color: speakerColor ?? '',
          expectModified: composeState.edit.time,
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

    let uploadResult: Awaited<ReturnType<typeof uploadMessageMedia>> | null = null;
    const handleEditFailure = (messageId: string, failTo: Extract<FailTo, { type: 'EDIT' }>) => {
      const optimisticEdit =
        store.get(chatAtom).channels[channelId]?.optimisticMessageMap[messageId];
      if (optimisticEdit?.item.timestamp !== sendStartTime) return;

      chatDispatch({
        type: 'fail',
        payload: { failTo, key: messageId, timestamp: sendStartTime },
      });
      const canRestoreEdit = store.get(composeAtom) === composeStateAfterSent;
      if (canRestoreEdit) {
        composeDispatch({ type: 'restoreFailedEdit', payload: composeState });
      } else if (composeState.source.trim() !== '') {
        saveDraftInWorker(channelId, composeState.source);
      }
      setBanner({
        level: 'WARNING',
        content: canRestoreEdit
          ? intl.formatMessage({
              defaultMessage: 'The edit could not be submitted. Your edits have been restored.',
            })
          : intl.formatMessage({
              defaultMessage:
                'The edit could not be submitted. Your edits have been saved as a draft.',
            }),
      });
    };
    if (composeState.media instanceof File) {
      uploadResult = await uploadMessageMedia(composeState.media);
    }
    if (uploadResult?.isOk === false) {
      let key: string;
      let failTo: FailTo;
      if (payload.type === 'NEW') {
        key = composeState.previewId;
        failTo = { type: 'SEND', onUpload: uploadResult.err };
      } else {
        handleEditFailure(payload.editMessage.messageId, {
          type: 'EDIT',
          onUpload: uploadResult.err,
        });
        return;
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
      if (result !== 'TIMEOUT' && !result.isOk && result.err.code === 'CONFLICT') {
        chatDispatch({
          type: 'removeOptimisticMessage',
          payload: { id: payload.editMessage.messageId, timestamp: sendStartTime },
        });
        if (composeState.source.trim() !== '') {
          saveDraftInWorker(channelId, composeState.source);
        }
        setBanner({
          level: 'WARNING',
          content: intl.formatMessage({
            defaultMessage:
              'This message was edited elsewhere before your edit was submitted. Your edits have been saved as a draft.',
          }),
        });
      } else if (result === 'TIMEOUT' || !result.isOk) {
        handleEditFailure(payload.editMessage.messageId, { type: 'EDIT' });
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
    channelCharacterName,
    resolve,
    store,
    composeAtom,
    checkComposeAtom,
    defaultDiceFaceRef,
    defaultInGame,
    setBanner,
    intl,
    channelId,
  ]);

  return send;
};
