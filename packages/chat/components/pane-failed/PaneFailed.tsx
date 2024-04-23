import { FC } from 'react';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { FormattedMessage } from 'react-intl';
import { Failed, FailedProps } from '../common/Failed';
import Icon from '@boluo/ui/Icon';
import { AlertTriangle } from '@boluo/icons';

export const PaneFailed: FC<FailedProps> = ({ title, ...props }) => {
  return (
    <PaneBox
      header={
        <PaneHeaderBox icon={props.icon ?? <Icon icon={AlertTriangle} className="text-failed-icon" />}>
          {title ?? <FormattedMessage defaultMessage="Oops!" />}
        </PaneHeaderBox>
      }
    >
      <div className="p-pane h-full">
        <Failed {...props} />
      </div>
    </PaneBox>
  );
};