import { User } from 'api';
import { FC, memo } from 'react';
import { FormattedMessage } from 'react-intl';
import { isApple } from 'utils';
import { useComposeError } from '../../hooks/useComposeError';
import { useQuerySettings } from '../../hooks/useQuerySettings';
import { mediaMaxSizeMb } from '../../media';
import { ComposeError } from '../../state/compose.reducer';
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
    case 'MEDIA_TOO_LARGE':
      return (
        <FormattedMessage
          defaultMessage="File size must be less than {sizeLimit}M"
          values={{ sizeLimit: mediaMaxSizeMb }}
        />
      );
    case 'MEDIA_TYPE_NOT_SUPPORTED':
      return <FormattedMessage defaultMessage="Unsupported media type" />;
    default:
      return <FormattedMessage defaultMessage="Unable to send message" />;
  }
};

export const SelfPreviewSendHelpText = memo<Props>(({ me }) => {
  const { data: settings } = useQuerySettings();
  const composeError = useComposeError();
  const send = useSend(me, composeError);
  if (composeError === 'TEXT_EMPTY') {
    return null;
  }
  if (composeError !== null) {
    return (
      <div className="text-error-500 text-sm">
        <Reason error={composeError} />
      </div>
    );
  }
  const key = settings?.enterSend ? '⏎' : isApple() ? '⌘ + ⏎' : 'Ctrl + ⏎';
  const sendNode = (
    <button className="text-surface-600 underline" onClick={send}>
      Send
    </button>
  );
  return (
    <div className="text-surface-400 text-sm">
      <FormattedMessage defaultMessage="Press {key} to {send}" values={{ key, send: sendNode }} />
    </div>
  );
});

SelfPreviewSendHelpText.displayName = 'SelfPreviewSendHelpText';
