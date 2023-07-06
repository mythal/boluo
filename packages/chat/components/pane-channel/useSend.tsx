import { ApiError, Message, User } from 'api';
import { patch, post } from 'api-browser';
import { useStore } from 'jotai';
import { useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui';
import { Result } from 'utils';
import { useSetBanner } from '../../hooks/useBanner';
import { useChannelId } from '../../hooks/useChannelId';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { parse } from '../../interpreter/parser';
import { upload } from '../../media';
import { ComposeActionUnion, makeComposeAction } from '../../state/compose.actions';

export const useSend = (me: User) => {
  const channelId = useChannelId();
  const store = useStore();
  const composeAtom = useComposeAtom();
  const setBanner = useSetBanner();
  const { nickname } = me;

  const send = useCallback(async () => {
    const compose = store.get(composeAtom);
    if (compose.error !== null) {
      return;
    }
    const backupComposeState = compose;
    const dispatch = (action: ComposeActionUnion) => store.set(composeAtom, action);
    const handleRecover = () => {
      dispatch(makeComposeAction('recoverState', backupComposeState));
      setBanner(null);
    };
    dispatch(makeComposeAction('sent', {}));
    const { text, entities } = parse(compose.source);
    let result: Result<Message, ApiError>;
    const name = compose.inputedName.trim() || nickname;
    const isEditing = compose.editFor !== null;
    if (isEditing) {
      result = await patch('/messages/edit', null, {
        messageId: compose.previewId,
        name,
        text: compose.parsed.text,
        entities: compose.parsed.entities,
        inGame: compose.inGame,
        isAction: compose.isAction,
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
        isAction: compose.isAction,
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
  }, [channelId, composeAtom, nickname, setBanner, store]);

  return send;
};
