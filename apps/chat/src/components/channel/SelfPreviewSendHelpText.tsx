import { User } from 'api';
import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, memo, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { isApple } from 'utils';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { useSettings } from '../../hooks/useSettings';
import { ComposeError } from '../../state/compose';
import { useSend } from './useSend';

interface Props {
  me: User;
}

const Reason: FC<{ error: ComposeError }> = ({ error }) => {
  switch (error) {
    case 'TEXT_EMPTY':
      return <FormattedMessage defaultMessage="Message cannot be empty" />;
    case 'NO_NAME':
      return <FormattedMessage defaultMessage="Character name is required" />;
    default:
      return <FormattedMessage defaultMessage="Unable to send message" />;
  }
};

export const SelfPreviewSendHelpText = memo<Props>(({ me }) => {
  const send = useSend(me);
  const settings = useSettings();
  const composeAtom = useComposeAtom();
  const composeError: ComposeError | null = useAtomValue(useMemo(() => {
    return selectAtom(composeAtom, (compose) => compose.error);
  }, [composeAtom]));
  if (composeError === 'TEXT_EMPTY') {
    return null;
  }
  if (composeError !== null) {
    return (
      <div className="text-sm text-error-500">
        <Reason error={composeError} />
      </div>
    );
  }
  const key = settings.enterSend ? '⏎' : isApple() ? '⌘ + ⏎' : 'Ctrl + ⏎';
  const sendNode = <button className="underline text-surface-600" onClick={send}>Send</button>;
  return (
    <div className="text-sm text-surface-400">
      <FormattedMessage defaultMessage="Press {key} to {send}" values={{ key, send: sendNode }} />
    </div>
  );
});

SelfPreviewSendHelpText.displayName = 'SelfPreviewSendHelpText';
