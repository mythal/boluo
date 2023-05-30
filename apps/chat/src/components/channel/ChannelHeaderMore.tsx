import { useMe } from 'common';
import { FC } from 'react';
import { MemberLeaveButton } from './MemberLeaveButton';

interface Props {
  channelId: string;
  resetHeaderState: () => void;
}

export const ChannelHeaderMore: FC<Props> = ({ channelId, resetHeaderState }) => {
  const me = useMe();
  return (
    <div className="py-2 px-4 border-b flex justify-between gap-2">
      {me && <MemberLeaveButton me={me} channelId={channelId} onSuccess={resetHeaderState} />}
    </div>
  );
};
