import { refreshEntries } from '../../entries/cache';
import { matchesMessageComponentHistory } from '../../entries/useMessageComponentHistory';
import {
  type NewMessage,
  type EditMessage,
  type MemberWithUser,
  type EditMessageAttribution,
} from '@boluo/api';
import { patch, post } from '@boluo/api-browser';
import { useStore } from 'jotai';
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useChannelId } from '../../hooks/useChannelId';
import { useQueryChannelMembers } from '@boluo/hooks/useQueryChannelMembers';
import { parseModifiers, needsVariableEnvironment } from '@boluo/interpreter';
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
import { findMessage } from '../../state/channel.reducer';
import { saveDraftInWorker } from '../../state/compose-backup.worker-client';
import { useChannelCharacterName } from '../../hooks/useChannelCharacter';
import { usePortrayableCharacters } from '../../hooks/usePortrayableCharacters';
import { selectedPortraitIdForCharacter } from '../../state/characterPortraitSelection';
import { resolveSpeaker } from '../../characters/resolveSpeaker';

import { useSWRConfig } from 'swr';
import { commitCounterBatch, loadCounters } from '../../counters/api';
import { resolveCounterTarget } from '../../counters/useComposeCountersAtom';
import { prepareCounterMessage } from '../../counters/prepare-message';
import { counterIssueMessage } from '../../counters/feedback';

const SEND_TIMEOUT = 8000;

export const useSend = () => {
  const channelId = useChannelId();
  const defaultInGame = useDefaultInGame();
  const intl = useIntl();
  const { composeAtom, composeIssuesAtom, defaultDiceFaceRef, sendingAtom } = useChannelAtoms();
  const store = useStore();

  const myMember = useMember();
  const channelCharacterName = useChannelCharacterName(myMember);
  const {
    resolve,
    characters,
    error: charactersError,
  } = usePortrayableCharacters(myMember?.space.spaceId);
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
  const { mutate } = useSWRConfig();

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

    const modifiers = parseModifiers(composeState.source);
    const { speaker, issue: speakerIssue } = resolveSpeaker({
      nickname,
      defaultInGame,
      parsedInGame: modifiers.inGame ? modifiers.inGame.inGame : null,
      asTarget: modifiers.asTarget,
      originalMessageAttribution: composeState.originalMessageAttribution,
      channelCharacterId: myMember.channel.characterId,
      channelCharacterName,
      resolveCharacter: resolve,
    });
    if (speakerIssue != null) return;
    const { character, hasTarget } = resolveCounterTarget({
      target: modifiers.asTarget,
      channelCharacterId: myMember.channel.characterId,
      originalMessageAttribution: composeState.originalMessageAttribution,
      defaultInGame,
      parsedInGame: modifiers.inGame ? modifiers.inGame.inGame : null,
      characters: characters ?? [],
    });
    if (needsVariableEnvironment(composeState.source) && hasTarget && characters == null) {
      setBanner({
        level: 'ERROR',
        content: counterIssueMessage(intl, {
          type: charactersError ? 'LoadFailed' : 'LoadingCounters',
        }),
      });
      return;
    }
    const prepared = await prepareCounterMessage({
      source: composeState.source,
      editing: composeState.edit != null,
      spaceId: myMember.space.spaceId,
      character,
      defaultDiceFace: defaultDiceFaceRef.current,
      loadEntries: loadCounters,
    });
    if (prepared.type === 'Error') {
      setBanner({ level: 'ERROR', content: counterIssueMessage(intl, prepared.error) });
      return;
    }
    // Do not clear a newer draft after waiting for counter data.
    const currentCompose = store.get(composeAtom);
    if (
      currentCompose.source !== composeState.source ||
      currentCompose.previewId !== composeState.previewId ||
      currentCompose.media !== composeState.media ||
      currentCompose.edit !== composeState.edit ||
      currentCompose.selectedCharacterPortrait !== composeState.selectedCharacterPortrait
    ) {
      setBanner({
        level: 'WARNING',
        content: intl.formatMessage({
          defaultMessage: 'Your input changed while preparing the message. Please send again.',
        }),
      });
      return;
    }
    const parsedForSend = prepared.parsed;
    const counterBatch = prepared.batch;
    const { text, entities, whisperToUsernames } = parsedForSend;
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
    const selectedPortraitId = selectedPortraitIdForCharacter(
      characterId,
      composeState.selectedCharacterPortrait,
    );
    const portraitId =
      selectedPortraitId ??
      (speaker.source === 'Editing' && characterId != null ? (speaker.portraitId ?? null) : null);
    const speakerPresentation = {
      name,
      characterId,
      portraitId,
      inGame,
      color: speakerColor ?? '',
    };
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
          portraitId,
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
      const originalAttribution = composeState.originalMessageAttribution;
      const attributionUnchanged =
        originalAttribution != null &&
        originalAttribution.name === name &&
        originalAttribution.characterId === characterId &&
        originalAttribution.portraitId === portraitId &&
        originalAttribution.inGame === inGame &&
        originalAttribution.color === speakerPresentation.color;
      let attribution: EditMessageAttribution | null | undefined;
      if (attributionUnchanged) {
        attribution = undefined;
      } else if (characterId == null) {
        attribution = {
          type: 'custom',
          name,
          color: speakerPresentation.color,
          inGame,
        };
      } else {
        attribution = {
          type: 'character',
          characterId,
          portraitId,
        };
      }
      payload = {
        type: 'EDIT',
        editMessage: {
          // In edit mode, the `compose.previewId` is the message id.
          spaceId: myMember.space.spaceId,
          messageId: composeState.previewId,
          attribution,
          text,
          entities,
          isAction: parsedForSend.isAction,
          mediaId: typeof composeState.media === 'string' ? composeState.media : null,
          expectModified: composeState.edit.time,
        },
      };
      chatDispatch({
        type: 'messageEditing',
        payload: {
          editMessage: payload.editMessage,
          speaker: speakerPresentation,
          sendTime: sendStartTime,
          media: composeState.media instanceof File ? composeState.media : null,
          composeState,
        },
      });
    }

    let uploadResult: Awaited<ReturnType<typeof upload>> | null = null;
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
      uploadResult = await upload(composeState.media);
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
            speaker: speakerPresentation,
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
      if (result !== 'TIMEOUT' && result.isOk && counterBatch != null) {
        const committed = await commitCounterBatch({ ...counterBatch, messageId: result.some.id });
        void Promise.allSettled([
          refreshEntries(mutate, counterBatch.spaceId, counterBatch.scopeId),
          mutate(matchesMessageComponentHistory(counterBatch.spaceId, result.some.id)),
        ]);
        if (committed === 'WriteFailed') {
          setBanner({
            level: 'ERROR',
            content: intl.formatMessage({
              defaultMessage:
                'The message was sent, but the counter update could not be confirmed. Check .st before trying again.',
            }),
          });
        }
      }
    }
  }, [
    myMember,
    channelCharacterName,
    resolve,
    characters,
    charactersError,
    mutate,
    store,
    composeAtom,
    defaultDiceFaceRef,
    defaultInGame,
    setBanner,
    intl,
    channelId,
  ]);

  return useCallback(async () => {
    if (store.get(composeIssuesAtom).length > 0) return;
    store.set(sendingAtom, true);
    try {
      await send();
    } catch (error) {
      recordWarn('Could not send message', { error });
      setBanner({
        level: 'ERROR',
        content: intl.formatMessage({
          defaultMessage: 'Could not send message. Please try again.',
        }),
      });
    } finally {
      store.set(sendingAtom, false);
    }
  }, [send, store, composeIssuesAtom, sendingAtom, setBanner, intl]);
};
