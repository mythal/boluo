import { FC } from 'react';
import { ChannelHeaderFilter } from './ChannelHeaderFilter';
import { ChannelHeaderFilterShowArchive } from './ChannelHeaderFilterShowArchive';

interface Props {}

export const ChannelHeaderFilterBar: FC<Props> = () => {
  return (
    <div className="py-2 px-4 border-b flex justify-between gap-2">
      <ChannelHeaderFilter />
      <ChannelHeaderFilterShowArchive />
    </div>
  );
};
