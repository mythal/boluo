import { PersonRunning } from '@boluo/icons';
import { Delay } from '../Delay';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from '@boluo/ui/Icon';

export const IsActionIndicator: FC = ({}) => {
  return (
    <span className={`text-message-action mr-1 select-none text-sm`}>
      <Delay fallback={null}>
        <Icon icon={PersonRunning} className="mr-1 inline" />
      </Delay>
      <FormattedMessage defaultMessage="Action" />
    </span>
  );
};
