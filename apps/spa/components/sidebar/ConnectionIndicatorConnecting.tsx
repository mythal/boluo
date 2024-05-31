import { FC } from 'react';
import { FormattedMessage } from 'react-intl';

interface Props {}

export const ConnectionIndicatorConnecting: FC<Props> = ({}) => {
  return (
    <div>
      <FormattedMessage defaultMessage="Connecting" />
    </div>
  );
};
