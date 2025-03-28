import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';

export const ConnectionIndicatorConnecting: FC = () => {
  return (
    <div>
      <FormattedMessage defaultMessage="Connecting" />
    </div>
  );
};
