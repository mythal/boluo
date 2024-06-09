import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';

export const EntityUnknown: FC = () => (
  <span className="font-mono">
    [<FormattedMessage defaultMessage="Unsupported" />]
  </span>
);
