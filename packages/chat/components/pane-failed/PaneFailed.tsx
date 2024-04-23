import { FC } from 'react';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { FormattedMessage } from 'react-intl';
import { Failed, FailedProps } from '../common/Failed';

export const PaneFailed: FC<FailedProps> = (props) => {
  return (
    <PaneBox
      header={
        <PaneHeaderBox icon={props.icon}>{props.title ?? <FormattedMessage defaultMessage="Oops!" />}</PaneHeaderBox>
      }
    >
      <div className="p-pane h-full">
        <Failed {...props} />
      </div>
    </PaneBox>
  );
};
