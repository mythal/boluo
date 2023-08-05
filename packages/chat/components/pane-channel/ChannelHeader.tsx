import { Hash } from 'icons';
import { atom } from 'jotai';
import { FC, useMemo } from 'react';
import { useChannelId } from '../../hooks/useChannelId';
import { useQueryChannel } from '../../hooks/useQueryChannel';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { ChannelHeaderExtra } from './ChannelHeaderExtra';
import { ChannelHeaderOperations } from './ChannelHeaderOperations';

export type ChannelHeaderState = 'DEFAULT' | 'MORE' | 'FILTER';

const ChannelName: FC<{ channelId: string }> = ({ channelId }) => {
  const { data: channel } = useQueryChannel(channelId);
  return <span className="overflow-hidden whitespace-nowrap overflow-ellipsis">{channel?.name ?? '...'}</span>;
};

export const ChannelHeader: FC = () => {
  const channelId = useChannelId();
  const headerStateAtom = useMemo(() => atom<ChannelHeaderState>('DEFAULT'), []);
  return (
    <PaneHeaderBox
      icon={<Hash />}
      operators={<ChannelHeaderOperations stateAtom={headerStateAtom} channelId={channelId} />}
      extra={<ChannelHeaderExtra channelId={channelId} stateAtom={headerStateAtom} />}
    >
      <ChannelName channelId={channelId} />
    </PaneHeaderBox>
  );
};
