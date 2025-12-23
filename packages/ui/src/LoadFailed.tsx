import Unplug from '@boluo/icons/Unplug';
import Icon from './Icon';
import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';

export const LoadFailed: FC = () => {
  return (
    <div className="flex flex-col items-baseline gap-2">
      <h1 className="text-lg">
        <Icon icon={Unplug} className="text-state-warning-text" />{' '}
        <FormattedMessage defaultMessage="Failed to load app resources" />
      </h1>

      <div className="py-2 leading-relaxed">
        <p>
          <FormattedMessage defaultMessage="This may be because the application was updated or your network is unstable." />
        </p>

        <p>
          <FormattedMessage defaultMessage="Try refreshing the page. If the problem persists, clear your browser cache or try another browser." />
        </p>

        <p>
          <FormattedMessage defaultMessage="If you are still unable to resolve the issue, please report it as a bug." />
        </p>
      </div>
    </div>
  );
};
