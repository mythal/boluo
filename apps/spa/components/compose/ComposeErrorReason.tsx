import { type FC } from 'react';
import { type ComposeError } from '../../state/compose.reducer';
import { FormattedMessage } from 'react-intl';
import { mediaMaxSizeMb } from '../../media';

export const ComposeErrorReason: FC<{ error: ComposeError }> = ({ error }) => {
  switch (error) {
    case 'TEXT_EMPTY':
      return <FormattedMessage defaultMessage="Message cannot be empty." />;
    case 'NO_NAME':
      return (
        <FormattedMessage defaultMessage="Sending an in-game message requires a character name." />
      );
    case 'MEDIA_TOO_LARGE':
      return (
        <FormattedMessage
          defaultMessage="File size must be less than {sizeLimit}M."
          values={{ sizeLimit: mediaMaxSizeMb }}
        />
      );
    case 'MEDIA_TYPE_NOT_SUPPORTED':
      return <FormattedMessage defaultMessage="Unsupported media type." />;
    default:
      return <FormattedMessage defaultMessage="Unable to send message." />;
  }
};
