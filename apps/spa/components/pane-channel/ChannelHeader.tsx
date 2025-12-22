import Drama from '@boluo/icons/Drama';
import Hash from '@boluo/icons/Hash';
import { atom } from 'jotai';
import { type FC, useMemo } from 'react';
import { ChannelName } from './ChannelName';
import { useChannelId } from '../../hooks/useChannelId';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { ChannelHeaderExtra } from './ChannelHeaderExtra';
import { ChannelHeaderOperations } from './ChannelHeaderOperations';
import { useChannel } from '../../hooks/useChannel';

export type ChannelHeaderState = 'DEFAULT' | 'MORE' | 'FILTER' | 'TOPIC';

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
  const channelName = useMemo(
    () => (
      <ChannelName
        stateAtom={headerStateAtom}
        name={channel?.name}
        topic={channel?.topic}
        isPublic={channel?.isPublic}
      />
    ),
    [channel, headerStateAtom],
  );
  const operators = useMemo(() => {
    return channel ? (
      <ChannelHeaderOperations stateAtom={headerStateAtom} channel={channel} />
    ) : null;
  }, [channel, headerStateAtom]);
  const extra = useMemo(() => {
    return <ChannelHeaderExtra channelId={channelId} stateAtom={headerStateAtom} />;
  }, [channelId, headerStateAtom]);
  return (
    <PaneHeaderBox icon={icon} operators={operators} extra={extra}>
      {channelName}
    </PaneHeaderBox>
  );
};
