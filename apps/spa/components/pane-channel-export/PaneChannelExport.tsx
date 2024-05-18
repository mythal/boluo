import { FormattedMessage } from 'react-intl';
import { useQueryChannel } from '../../hooks/useQueryChannel';
import { Failed } from '../common/Failed';
import { FC } from 'react';
import { Loading } from '@boluo/ui/Loading';
import { PaneBox } from '../PaneBox';
import { Channel } from '@boluo/api';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { ScrollText } from '@boluo/icons';

export const PaneChannelExport: FC<{ channelId: string }> = ({ channelId }) => {
  const { data: channel, error } = useQueryChannel(channelId);
  if (error && channel == null) {
    return <Failed error={error} title={<FormattedMessage defaultMessage="Failed to query the channel" />} />;
  } else if (!channel) {
    return <Loading />;
  }

  return (
    <PaneBox header={<PaneChannelExportHeader channel={channel} />}>
      <div className="p-pane text-text-lighter">Placeholder</div>
    </PaneBox>
  );
};

const PaneChannelExportHeader: FC<{ channel: Channel }> = ({ channel }) => {
  return (
    <PaneHeaderBox icon={<ScrollText />}>
      <span className="overflow-hidden overflow-ellipsis whitespace-nowrap">
        <FormattedMessage defaultMessage='Export "{channelName}"' values={{ channelName: channel.name }} />
      </span>
    </PaneHeaderBox>
  );
};
