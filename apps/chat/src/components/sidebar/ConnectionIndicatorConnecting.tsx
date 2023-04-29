import { useAtomValue } from 'jotai';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { devMode } from '../../state/dev.atoms';

interface Props {
}

export const ConnectionIndicatorConnecting: FC<Props> = ({}) => {
  const isDevMode = useAtomValue(devMode);
  return (
    <div>
      <div>
        <FormattedMessage defaultMessage="Connecting" />
      </div>
    </div>
  );
};
