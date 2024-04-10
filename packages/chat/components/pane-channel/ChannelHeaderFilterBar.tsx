import { FC } from 'react';
import { ChannelHeaderFilter } from './ChannelHeaderFilter';
import { ChannelHeaderFilterShowArchive } from './ChannelHeaderFilterShowArchive';

interface Props {}

export const ChannelHeaderFilterBar: FC<Props> = () => {
  return (
    <div className="@md:flex-row @md:items-center px-pane bg-pane-header-bg flex flex-col justify-between gap-2 py-2">
      <ChannelHeaderFilter />
      <ChannelHeaderFilterShowArchive />
    </div>
  );
};
