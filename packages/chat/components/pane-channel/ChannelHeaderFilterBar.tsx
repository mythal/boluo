import { FC } from 'react';
import { ChannelHeaderFilter } from './ChannelHeaderFilter';
import { ChannelHeaderFilterShowArchive } from './ChannelHeaderFilterShowArchive';

interface Props {}

export const ChannelHeaderFilterBar: FC<Props> = () => {
  return (
    <div className="py-2 px-4 border-b flex flex-col @md:flex-row justify-between @md:items-center gap-2">
      <ChannelHeaderFilter />
      <ChannelHeaderFilterShowArchive />
    </div>
  );
};
