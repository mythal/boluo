import { ApiError, Message, User } from '@boluo/api';
import { patch, post } from '@boluo/api-browser';
import { useStore } from 'jotai';
import { useCallback, useMemo } from 'react';
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
import { ComposeError } from '../../state/compose.reducer';

export const useSend = (me: User, composeError: ComposeError | null) => {
  const channelId = useChannelId();
  const store = useStore();
  const { composeAtom, parsedAtom } = useChannelAtoms();
  const setBanner = useSetBanner();
  const { data: queryChannelMembers } = useQueryChannelMembers(channelId);
  const { nickname } = me;
  const myMember = useMemo(() => {
    if (queryChannelMembers == null) return null;
    return queryChannelMembers.members.find((member) => member.user.id === me.id) ?? null;
  }, [me.id, queryChannelMembers]);

  const usernameListToUserIdList = useCallback(
    (usernames: string[]): string[] => {
      if (queryChannelMembers == null) return [];
      return usernames.flatMap((username) => {
        const member = queryChannelMembers.members.find((member) => member.user.username === username);
        if (member == null) return [];
        return [member.user.id];
      });
    },
    [queryChannelMembers],
  );

  const send = useCallback(async () => {
    if (myMember == null) {
      console.warn('Cannot find my channel member');
      return;
    }
    const compose = store.get(composeAtom);
    const parsed = store.get(parsedAtom);
    if (composeError !== null) return;
    const backupComposeState = compose;
    const dispatch = (action: ComposeActionUnion) => store.set(composeAtom, action);
    const handleRecover = () => {
      dispatch({ type: 'recoverState', payload: backupComposeState });
      setBanner(null);
    };
    dispatch({ type: 'sent', payload: {} });
    const { text, entities, whisperToUsernames } = parse(compose.source);
    let result: Result<Message, ApiError>;
    let name = nickname;
    const inGame = parsed.inGame ?? compose.defaultInGame;
    if (inGame) {
      const inputedName = compose.inputedName.trim();
      if (inputedName === '') {
        name = myMember.channel.characterName;
      } else {
        name = inputedName;
      }
    }
    const isEditing = compose.editFor !== null;

    let uploadResult: Awaited<ReturnType<typeof upload>> | null = null;
    if (compose.media instanceof File) {
      uploadResult = await upload(compose.media);
    }
    if (uploadResult?.isOk === false) {
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
      return;
    }
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
    composeAtom,
    composeError,
    myMember,
    nickname,
    parsedAtom,
    setBanner,
    store,
    usernameListToUserIdList,
  ]);

  return send;
};
