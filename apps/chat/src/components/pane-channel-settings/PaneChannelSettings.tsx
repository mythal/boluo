import { FC } from 'react';
import { useChannel } from '../../hooks/useChannel';
import { PaneBox } from '../PaneBox';
import { PaneChannelSettingsHeader } from './PaneChannelSettingsHeader';

interface Props {
  channelId: string;
}

export const PaneChannelSettings: FC<Props> = ({ channelId }) => {
  const channel = useChannel(channelId);

  return (
    <PaneBox header={<PaneChannelSettingsHeader channel={channel} />}>
      <div className="p-4">TODO</div>
    </PaneBox>
  );
};
