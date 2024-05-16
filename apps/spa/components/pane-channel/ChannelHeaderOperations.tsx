import { Channel } from '@boluo/api';
import { PrimitiveAtom, useAtom } from 'jotai';
import { FC, ReactNode, useCallback } from 'react';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { ChannelHeaderState } from './ChannelHeader';
import { ChannelHeaderMoreButton } from './ChannelHeaderMenuButton';
import { ChannelHeaderSplitPaneButton } from './ChannelHeaderSplitPaneButton';
import { ChannelMembersButton } from './ChannelMembersButton';
import { MemberJoinButton } from './MemberJoinButton';
import { usePaneLimit } from '../../hooks/useMaxPane';

interface Props {
  stateAtom: PrimitiveAtom<ChannelHeaderState>;
  channel: Channel;
}

export const ChannelHeaderOperations: FC<Props> = ({ stateAtom, channel }) => {
  const [state, setState] = useAtom(stateAtom);
  const toggleMore = useCallback(() => setState((prev) => (prev === 'MORE' ? 'DEFAULT' : 'MORE')), [setState]);
  const paneLimit = usePaneLimit();
  return (
    <>
      {paneLimit > 1 && <ChannelHeaderSplitPaneButton />}
      <ChannelMembersButton spaceId={channel.spaceId} channelId={channel.id} />
      <ChannelHeaderMoreButton on={state === 'MORE'} toggle={toggleMore} />
    </>
  );
};
