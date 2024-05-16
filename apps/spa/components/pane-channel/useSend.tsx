import { ApiError, Message, User } from '@boluo/api';
import { patch, post } from '@boluo/api-browser';
import { useStore } from 'jotai';
import { useCallback, useMemo, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from '@boluo/ui/Button';
import { Result } from '@boluo/utils';
import { useSetBanner } from '../../hooks/useBanner';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useChannelId } from '../../hooks/useChannelId';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import { parse } from '../../interpreter/parser';
import { upload } from '../../media';
import { ComposeActionUnion } from '../../state/compose.actions';
import { useDefaultInGame } from '../../hooks/useDefaultInGame';
import { ChatActionUnion } from '../../state/chat.actions';
import { chatAtom } from '../../state/chat.atoms';

export const useSend = (me: User) => {
  const channelId = useChannelId();
  const defaultInGame = useDefaultInGame();
  const { composeAtom, parsedAtom, checkComposeAtom } = useChannelAtoms();
  const store = useStore();
  const setBanner = useSetBanner();
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
      const member = queryChannelMembers.members.find((member) => member.user.username === username);
      if (member == null) return [];
      return [member.user.id];
    });
  }, []);

  const send = useCallback(async () => {
    if (myMember == null) {
      console.warn('Cannot find my channel member');
      return;
    }
    const compose = store.get(composeAtom);
    const parsed = store.get(parsedAtom);
    if (store.get(checkComposeAtom) !== null) return;
    const backupComposeState = compose;
    const chatDispatch = (action: ChatActionUnion) => store.set(chatAtom, action);
    const composeDispatch = (action: ComposeActionUnion) => store.set(composeAtom, action);
    const handleRecover = () => {
      composeDispatch({ type: 'recoverState', payload: backupComposeState });
      setBanner(null);
    };
    const isEditing = compose.editFor !== null;
    composeDispatch({ type: 'sent', payload: { edit: isEditing } });
    const { text, entities, whisperToUsernames } = parse(compose.source);
    let result: Result<Message, ApiError>;
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
    chatDispatch({
      type: 'messageSending',
      payload: { channelId, previewId: compose.previewId, parsed, inGame, name, compose },
    });

    let uploadResult: Awaited<ReturnType<typeof upload>> | null = null;
    if (compose.media instanceof File) {
      uploadResult = await upload(compose.media);
    }
    if (uploadResult?.isOk === false) {
      chatDispatch({ type: 'messageSendFailed', payload: { channelId, previewId: compose.previewId } });
      setBanner({
        level: 'WARNING',
        content: (
          <div className="">
            <FormattedMessage defaultMessage="Error while uploading a file, did you recover the message?" />
            <Button data-small className="ml-2" onClick={handleRecover}>
              <FormattedMessage defaultMessage="Recover" />
            </Button>
          </div>
        ),
      });
      return;
    }
    const mediaId = uploadResult?.isOk ? uploadResult.some.mediaId : null;
    if (isEditing) {
      result = await patch('/messages/edit', null, {
        messageId: compose.previewId,
        name,
        text: parsed.text,
        entities: parsed.entities,
        inGame,
        isAction: parsed.isAction,
        mediaId,
        color: '',
      });
    } else {
      result = await post('/messages/send', null, {
        messageId: null,
        previewId: compose.previewId,
        channelId,
        name,
        text,
        entities,
        inGame,
        isAction: parsed.isAction,
        mediaId,
        pos: null,
        whisperToUsers: whisperToUsernames ? usernameListToUserIdList(whisperToUsernames) : null,
        color: '',
      });
    }

    if (result.isOk) {
      chatDispatch({ type: 'messageSent', payload: { channelId, message: result.some } });
      return;
    }
    chatDispatch({ type: 'messageSendFailed', payload: { channelId, previewId: compose.previewId } });
    setBanner({
      level: 'WARNING',
      content: (
        <div className="">
          <FormattedMessage defaultMessage="Error while sending a message, did you recover the message?" />
          <Button data-small className="ml-2" onClick={handleRecover}>
            <FormattedMessage defaultMessage="Recover" />
          </Button>
        </div>
      ),
    });
  }, [
    channelId,
    checkComposeAtom,
    composeAtom,
    defaultInGame,
    myMember,
    nickname,
    parsedAtom,
    setBanner,
    store,
    usernameListToUserIdList,
  ]);

  return send;
};
