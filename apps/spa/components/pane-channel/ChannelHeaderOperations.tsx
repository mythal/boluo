import { type Channel } from '@boluo/api';
import { type PrimitiveAtom, useAtom } from 'jotai';
import { type FC, useCallback } from 'react';
import { type ChannelHeaderState } from './ChannelHeader';
import { ChannelHeaderMoreButton } from './ChannelHeaderMenuButton';
import { ChannelHeaderSplitPaneButton } from './ChannelHeaderSplitPaneButton';
import { ChannelMembersButton } from './ChannelMembersButton';
import { usePaneLimit } from '../../hooks/useMaxPane';
import { useIsChildPane } from '../../hooks/useIsChildPane';
import { ChannelSearchButton } from './ChannelSearchButton';

interface Props {
  stateAtom: PrimitiveAtom<ChannelHeaderState>;
  channel: Channel;
}

export const ChannelHeaderOperations: FC<Props> = ({ stateAtom, channel }) => {
  const [state, setState] = useAtom(stateAtom);
  const isChildPane = useIsChildPane();
  const toggleMore = useCallback(
    () => setState((prev) => (prev === 'MORE' ? 'DEFAULT' : 'MORE')),
    [setState],
  );
  const paneLimit = usePaneLimit();
  return (
    <>
      {paneLimit > 1 && !isChildPane && <ChannelHeaderSplitPaneButton />}
      <ChannelSearchButton />
      <ChannelMembersButton spaceId={channel.spaceId} channelId={channel.id} />
      <ChannelHeaderMoreButton on={state === 'MORE'} toggle={toggleMore} />
    </>
  );
};
