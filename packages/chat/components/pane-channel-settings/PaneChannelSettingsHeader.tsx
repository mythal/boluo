import { Channel } from '@boluo/api';
import { Settings } from '@boluo/icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { PaneHeaderBox } from '../PaneHeaderBox';

interface Props {
  channel: Channel;
}

export const PaneChannelSettingsHeader: FC<Props> = ({ channel }) => {
  return (
    <PaneHeaderBox icon={<Settings />}>
      <span className="overflow-hidden overflow-ellipsis whitespace-nowrap">
        <FormattedMessage defaultMessage='Settings of "{channelName}" Channel' values={{ channelName: channel.name }} />
      </span>
    </PaneHeaderBox>
  );
};
