import { type FC } from 'react';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { FormattedMessage } from 'react-intl';
import { Failed, type FailedProps } from '@boluo/ui/Failed';
import Icon from '@boluo/ui/Icon';
import AlertTriangle from '@boluo/icons/AlertTriangle';

export const PaneFailed: FC<FailedProps> = ({ title, ...props }) => {
  return (
    <PaneBox
      initSizeLevel={1}
      header={
        <PaneHeaderBox
          icon={props.icon ?? <Icon icon={AlertTriangle} className="text-state-warning-text" />}
        >
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
