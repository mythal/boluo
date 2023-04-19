import { User } from 'api';
import { usePost } from 'common';
import { useStore } from 'jotai';
import { useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui';
import { useSetBanner } from '../../hooks/useBanner';
import { useChannelId } from '../../hooks/useChannelId';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { parse } from '../../interpreter/parser';
import { ComposeActionUnion, makeComposeAction } from '../../state/actions/compose';

export const useSend = (me: User) => {
  const channelId = useChannelId();
  const store = useStore();
  const composeAtom = useComposeAtom();
  const setBanner = useSetBanner();
  const post = usePost();
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
    dispatch(makeComposeAction('setSource', { channelId, source: '', range: [0, 0] }));
    const { text, entities } = parse(compose.source);

    const result = await post('/messages/send', null, {
      messageId: null,
      previewId: compose.previewId,
      channelId,
      name: compose.inputedName.trim() || nickname,
      text,
      entities,
      inGame: compose.inGame,
      isAction: false,
      mediaId: null,
      pos: null,
      whisperToUsers: null,
    });
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
  }, [channelId, composeAtom, nickname, post, setBanner, store]);

  return send;
};
