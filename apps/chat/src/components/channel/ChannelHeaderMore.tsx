import { FC } from 'react';
import { ChannelHeaderMemberButton } from './ChannelHeaderMemberButton';

interface Props {
  channelId: string;
}

export const ChannelHeaderMore: FC<Props> = ({ channelId }) => {
  return (
    <div className="py-2 px-4 border-b flex justify-between gap-2">
      <ChannelHeaderMemberButton channelId={channelId} />
    </div>
  );
};
