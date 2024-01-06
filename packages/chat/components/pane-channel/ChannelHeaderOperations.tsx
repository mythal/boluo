import { Channel } from 'api';
import { useMe } from 'common';
import { PrimitiveAtom, useAtom } from 'jotai';
import { FC, ReactNode, useCallback } from 'react';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { ChannelHeaderState } from './ChannelHeader';
import { ChannelHeaderFilterButton } from './ChannelHeaderFilterButton';
import { ChannelHeaderMoreButton } from './ChannelHeaderMenuButton';
import { ChannelHeaderSplitPaneButton } from './ChannelHeaderSplitPaneButton';
import { ChannelMembersButton } from './ChannelMembersButton';
import { MemberJoinButton } from './MemberJoinButton';

interface Props {
  stateAtom: PrimitiveAtom<ChannelHeaderState>;
  channel: Channel;
}

export const ChannelHeaderOperations: FC<Props> = ({ stateAtom, channel }) => {
  const [state, setState] = useAtom(stateAtom);
  const toggleMore = useCallback(() => setState((prev) => (prev === 'MORE' ? 'DEFAULT' : 'MORE')), [setState]);
  const toggleFilterBar = useCallback(() => setState((prev) => (prev === 'FILTER' ? 'DEFAULT' : 'FILTER')), [setState]);
  const me = useMe();
  const channelMember = useMyChannelMember(channel.id);
  let memberButton: ReactNode = null;
  if (me && channelMember !== 'LOADING') {
    if (channelMember) {
      memberButton = <ChannelHeaderMoreButton on={state === 'MORE'} toggle={toggleMore} />;
    } else {
      memberButton = <MemberJoinButton channel={channel} />;
    }
  }
  return (
    <>
      {memberButton}
      <ChannelHeaderFilterButton on={state === 'FILTER'} toggle={toggleFilterBar} />
      <ChannelHeaderSplitPaneButton />
      <ChannelMembersButton spaceId={channel.spaceId} channelId={channel.id} />
    </>
  );
};
