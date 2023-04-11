import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useChannelId } from '../../hooks/useChannelId';
import { useSettings } from '../../hooks/useSettings';
import { composeAtomFamily } from '../../state/atoms/compose';
import { ComposeError } from '../../state/compose';
import { useSend } from './useSend';

interface Props {}

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

export const SelfPreviewSendHelpText: FC<Props> = () => {
  const send = useSend();
  const settings = useSettings();
  const channelId = useChannelId();
  const composeError: ComposeError | null = useAtomValue(useMemo(() => {
    const composeAtom = composeAtomFamily(channelId);
    return selectAtom(composeAtom, (compose) => compose.error);
  }, [channelId]));
  if (composeError !== null) {
    return (
      <div className="text-sm text-error-500">
        <Reason error={composeError} />
      </div>
    );
  }
  const key = settings.enterSend ? 'Enter' : 'Ctrl + Enter';
  const sendNode = <button className="underline text-surface-600" onClick={send}>Send</button>;
  return (
    <div className="text-sm text-surface-400">
      <FormattedMessage defaultMessage="Press {key} to {send}" values={{ key, send: sendNode }} />
    </div>
  );
};
