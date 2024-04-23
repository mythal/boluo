import { Channel } from '@boluo/api';
import { Hash, LockedHash } from '@boluo/icons';
import { atom } from 'jotai';
import { FC, useMemo } from 'react';
import { useChannelId } from '../../hooks/useChannelId';
import { useQueryChannel } from '../../hooks/useQueryChannel';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { ChannelHeaderExtra } from './ChannelHeaderExtra';
import { ChannelHeaderOperations } from './ChannelHeaderOperations';

export type ChannelHeaderState = 'DEFAULT' | 'MORE' | 'FILTER' | 'CHARACTER';

const ChannelName: FC<{ channel: Channel | undefined }> = ({ channel }) => {
  return <span className="overflow-hidden overflow-ellipsis whitespace-nowrap">{channel?.name ?? '...'}</span>;
};

export const ChannelHeader: FC = () => {
  const channelId = useChannelId();
  const { data: channel } = useQueryChannel(channelId);
  const headerStateAtom = useMemo(() => atom<ChannelHeaderState>('DEFAULT'), []);
  return (
    <PaneHeaderBox
      icon={channel && !channel.isPublic ? <LockedHash /> : <Hash />}
      operators={channel ? <ChannelHeaderOperations stateAtom={headerStateAtom} channel={channel} /> : null}
      extra={<ChannelHeaderExtra channelId={channelId} stateAtom={headerStateAtom} />}
    >
      <ChannelName channel={channel} />
    </PaneHeaderBox>
  );
};
