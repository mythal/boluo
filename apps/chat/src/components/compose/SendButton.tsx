import type { GetMe } from 'api';
import { usePost } from 'common';
import { PaperPlane } from 'icons';
import { useAtom } from 'jotai';
import { forwardRef, useCallback, useImperativeHandle, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import { useSetBanner } from '../../hooks/useBanner';
import { useChannelId } from '../../hooks/useChannelId';
import { makeComposeAction } from '../../state/actions/compose';
import { composeAtomFamily } from '../../state/atoms/compose';
import { ComposeState } from '../../state/compose';
import { useSendPreview } from './useSendPreview';

interface Props {
  me: GetMe;
}

export interface SendRef {
  send: () => void;
}

type VerifyResult = 'OK' | 'EMPTY' | 'NO_NAME';

const verifyCompose = (compose: ComposeState): VerifyResult => {
  if (compose.source.trim() === '') {
    return 'EMPTY';
  }
  if (compose.inGame && compose.inputedName.trim() === '') {
    return 'NO_NAME';
  }
  return 'OK';
};

export const SendButton = forwardRef<SendRef, Props>(({ me }, ref) => {
  const channelId = useChannelId();
  const composeAtom = useMemo(() => composeAtomFamily(channelId), [channelId]);
  const [compose, dispatch] = useAtom(composeAtom);
  const setBanner = useSetBanner();
  const post = usePost();
  const { nickname } = me.user;

  useSendPreview(channelId, nickname, compose);
  const verifyResult = verifyCompose(compose);

  const send = useCallback(async () => {
    if (verifyResult !== 'OK') {
      return;
    }
    const backupComposeState = compose;
    const handleRecover = () => {
      dispatch(makeComposeAction('recoverState', backupComposeState));
      setBanner(null);
    };
    dispatch(makeComposeAction('setSource', { channelId, source: '' }));

    const result = await post('/messages/send', null, {
      messageId: compose.previewId,
      channelId,
      name: nickname,
      text: compose.source,
      entities: [],
      inGame: false,
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
  }, [channelId, compose, dispatch, nickname, post, setBanner, verifyResult]);

  useImperativeHandle(ref, () => ({ send }), [send]);
  return (
    <Button onClick={() => send()} disabled={verifyResult !== 'OK'}>
      <FormattedMessage defaultMessage="Send" />
      <PaperPlane />
    </Button>
  );
});

SendButton.displayName = 'SendButton';
