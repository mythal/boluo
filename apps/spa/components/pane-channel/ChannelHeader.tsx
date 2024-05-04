import { Channel } from '@boluo/api';
import { Hash, LockedHash } from '@boluo/icons';
import { atom } from 'jotai';
import { FC, useMemo } from 'react';
import { useChannelId } from '../../hooks/useChannelId';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { ChannelHeaderExtra } from './ChannelHeaderExtra';
import { ChannelHeaderOperations } from './ChannelHeaderOperations';
import { useChannel } from '../../hooks/useChannel';

export type ChannelHeaderState = 'DEFAULT' | 'MORE' | 'FILTER' | 'CHARACTER';

const ChannelName: FC<{ channel: Channel | null | undefined }> = ({ channel }) => {
  return <span className="overflow-hidden overflow-ellipsis whitespace-nowrap">{channel?.name ?? '...'}</span>;
};

export const ChannelHeader: FC = () => {
  const channelId = useChannelId();
  const channel = useChannel();
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
