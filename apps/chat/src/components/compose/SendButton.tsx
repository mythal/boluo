import type { GetMe } from 'api';
import { usePost } from 'common';
import { PaperPlane } from 'icons';
import { useAtom } from 'jotai';
import { forwardRef, useCallback, useImperativeHandle, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import { useSetBanner } from '../../hooks/useBanner';
import { useChannelId } from '../../hooks/useChannelId';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { makeComposeAction } from '../../state/actions/compose';
import { useSendPreview } from './useSendPreview';

interface Props {
  me: GetMe;
}

export interface SendRef {
  send: () => void;
}

export const SendButton = forwardRef<SendRef, Props>(({ me }, ref) => {
  const channelId = useChannelId();
  const composeAtom = useComposeAtom();
  const [compose, dispatch] = useAtom(composeAtom);
  const setBanner = useSetBanner();
  const post = usePost();
  const { nickname } = me.user;

  const send = useCallback(async () => {
    if (compose.error !== null) {
      return;
    }
    const backupComposeState = compose;
    const handleRecover = () => {
      dispatch(makeComposeAction('recoverState', backupComposeState));
      setBanner(null);
    };
    dispatch(makeComposeAction('setSource', { channelId, source: '', range: [0, 0] }));

    const result = await post('/messages/send', null, {
      messageId: null,
      previewId: compose.previewId,
      channelId,
      name: compose.inputedName.trim() || nickname,
      text: compose.source,
      entities: [],
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
  }, [channelId, compose, dispatch, nickname, post, setBanner]);

  useImperativeHandle(ref, () => ({ send }), [send]);
  return (
    <Button onClick={() => send()} disabled={compose.error !== null}>
      <FormattedMessage defaultMessage="Send" />
      <PaperPlane />
    </Button>
  );
});

SendButton.displayName = 'SendButton';
