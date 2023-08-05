import { Channel } from 'api';
import { Settings } from 'icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { ClosePaneButton } from '../ClosePaneButton';
import { PaneHeaderBox } from '../PaneHeaderBox';

interface Props {
  channel: Channel;
}

export const PaneChannelSettingsHeader: FC<Props> = ({ channel }) => {
  return (
    <PaneHeaderBox icon={<Settings />}>
      <span className="overflow-hidden whitespace-nowrap overflow-ellipsis">
        <FormattedMessage
          defaultMessage="Settings of &quot;{channelName}&quot; Channel"
          values={{ channelName: channel.name }}
        />
      </span>
    </PaneHeaderBox>
  );
};
