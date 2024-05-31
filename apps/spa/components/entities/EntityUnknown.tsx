import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';

interface Props {
  text: string;
}

export const EntityUnknown: FC<Props> = () => (
  <span className="font-mono">
    [<FormattedMessage defaultMessage="Unsupported" />]
  </span>
);
