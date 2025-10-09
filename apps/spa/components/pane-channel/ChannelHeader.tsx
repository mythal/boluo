import { type Channel } from '@boluo/api';
import { Drama, Hash } from '@boluo/icons';
import { atom } from 'jotai';
import { type FC, useMemo } from 'react';
import { useChannelId } from '../../hooks/useChannelId';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { ChannelHeaderExtra } from './ChannelHeaderExtra';
import { ChannelHeaderOperations } from './ChannelHeaderOperations';
import { useChannel } from '../../hooks/useChannel';
import { FormattedMessage } from 'react-intl';

export type ChannelHeaderState = 'DEFAULT' | 'MORE' | 'FILTER' | 'CHARACTER';

const ChannelName: FC<{ channel: Channel | null | undefined }> = ({ channel }) => {
  if (!channel) {
    return <span>...</span>;
  }
  return (
    <span className="overflow-hidden overflow-ellipsis whitespace-nowrap">
      {!channel.isPublic ? (
        <span className="text-text-muted mr-1">
          [<FormattedMessage defaultMessage="Secret" />]
        </span>
      ) : (
        ''
      )}
      {channel.name}
    </span>
  );
};

export const ChannelHeader: FC = () => {
  const channelId = useChannelId();
  const channel = useChannel();
  const headerStateAtom = useMemo(() => atom<ChannelHeaderState>('DEFAULT'), []);
  const icon = useMemo(() => {
    if (!channel) {
      return <Hash />;
    } else if (channel.type === 'IN_GAME') {
      return <Drama />;
    }
    return <Hash />;
  }, [channel]);
  return (
    <PaneHeaderBox
      icon={icon}
      operators={
        channel ? <ChannelHeaderOperations stateAtom={headerStateAtom} channel={channel} /> : null
      }
      extra={<ChannelHeaderExtra channelId={channelId} stateAtom={headerStateAtom} />}
    >
      <ChannelName channel={channel} />
    </PaneHeaderBox>
  );
};
