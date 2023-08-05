import { useMe } from 'common';
import { PrimitiveAtom, useAtom } from 'jotai';
import { FC, ReactNode, useCallback } from 'react';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { ClosePaneButton } from '../ClosePaneButton';
import { ChannelHeaderState } from './ChannelHeader';
import { ChannelHeaderFilterButton } from './ChannelHeaderFilterButton';
import { ChannelHeaderMoreButton } from './ChannelHeaderMenuButton';
import { ChannelHeaderSplitPaneButton } from './ChannelHeaderSplitPaneButton';
import { MemberJoinButton } from './MemberJoinButton';

interface Props {
  stateAtom: PrimitiveAtom<ChannelHeaderState>;
  channelId: string;
}

export const ChannelHeaderOperations: FC<Props> = ({ stateAtom, channelId }) => {
  const [state, setState] = useAtom(stateAtom);
  const toggleMore = useCallback(() => setState(prev => prev === 'MORE' ? 'DEFAULT' : 'MORE'), [setState]);
  const toggleFilterBar = useCallback(() => setState(prev => prev === 'FILTER' ? 'DEFAULT' : 'FILTER'), [setState]);
  const me = useMe();
  const channelMember = useMyChannelMember(channelId);
  let memberButton: ReactNode = null;
  if (me) {
    if (channelMember) {
      memberButton = <ChannelHeaderMoreButton on={state === 'MORE'} toggle={toggleMore} />;
    } else {
      memberButton = <MemberJoinButton channelId={channelId} />;
    }
  }
  return (
    <>
      {memberButton}
      <ChannelHeaderFilterButton on={state === 'FILTER'} toggle={toggleFilterBar} />
      <ChannelHeaderSplitPaneButton />
    </>
  );
};
