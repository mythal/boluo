import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';

export const EntityUnknown: FC = () => (
  <span className="EntityUnknown font-mono">
    [<FormattedMessage defaultMessage="Unsupported" />]
  </span>
);
