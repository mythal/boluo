import { ApiError, ChannelMember, Message, User } from 'api';
import { patch, post } from 'api-browser';
import { useStore } from 'jotai';
import { useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import { Result } from 'utils';
import { useSetBanner } from '../../hooks/useBanner';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useChannelId } from '../../hooks/useChannelId';
import { parse } from '../../interpreter/parser';
import { upload } from '../../media';
import { ComposeActionUnion } from '../../state/compose.actions';
import { ComposeError } from '../../state/compose.reducer';

export const useSend = (me: User, member: ChannelMember, composeError: ComposeError | null) => {
  const channelId = useChannelId();
  const store = useStore();
  const { composeAtom, parsedAtom } = useChannelAtoms();
  const setBanner = useSetBanner();
  const { nickname } = me;

  const send = useCallback(async () => {
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
    const { text, entities } = parse(compose.source);
    let result: Result<Message, ApiError>;
    let name = nickname;
    if (compose.inGame) {
      const inputedName = compose.inputedName.trim();
      if (inputedName === '') {
        name = member.characterName;
      } else {
        name = inputedName;
      }
    }
    const isEditing = compose.editFor !== null;
    if (isEditing) {
      result = await patch('/messages/edit', null, {
        messageId: compose.previewId,
        name,
        text: parsed.text,
        entities: parsed.entities,
        inGame: compose.inGame,
        isAction: parsed.isAction,
        mediaId: null,
      });
    } else {
      let mediaId: string | null = null;
      if (compose.media) {
        const uploadResult = await upload(compose.media);
        if (uploadResult.isOk) {
          mediaId = uploadResult.some.mediaId;
        } else {
          // TODO: show error
          return;
        }
      }
      result = await post('/messages/send', null, {
        messageId: null,
        previewId: compose.previewId,
        channelId,
        name,
        text,
        entities,
        inGame: compose.inGame,
        isAction: parsed.isAction,
        mediaId,
        pos: null,
        whisperToUsers: null,
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
          <Button
            data-small
            className="ml-2"
            onClick={handleRecover}
          >
            <FormattedMessage defaultMessage="Recover" />
          </Button>
        </div>
      ),
    });
  }, [channelId, composeAtom, composeError, member.characterName, nickname, parsedAtom, setBanner, store]);

  return send;
};
