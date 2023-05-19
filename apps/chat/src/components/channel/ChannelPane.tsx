import clsx from 'clsx';
import { useMe } from 'common';
import { atomWithReducer, atomWithStorage } from 'jotai/utils';
import { FC, useMemo } from 'react';
import { memo } from 'react';
import { ChannelAtoms, ChannelAtomsContext, ChannelFilter } from '../../hooks/useChannelAtoms';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { composeReducer, makeInitialComposeState } from '../../state/compose.reducer';
import { Compose } from '../compose/Compose';
import { useSendPreview } from '../compose/useSendPreview';
import { PaneBox } from '../PaneBox';
import { ChannelHeader } from './ChannelHeader';
import { ChatContent } from './ChatContent';

interface Props {
  channelId: string;
}

export const ChatPaneChannel: FC<Props> = memo(({ channelId }) => {
  const me = useMe();
  const member = useMyChannelMember(channelId);
  const initialCompose = useMemo(makeInitialComposeState, []);
  const atoms: ChannelAtoms = useMemo(() => ({
    composeAtom: atomWithReducer(initialCompose, composeReducer),
    filterAtom: atomWithStorage<ChannelFilter>(`${channelId}:filter`, 'ALL'),
    showArchivedAtom: atomWithStorage(`${channelId}:show-archived`, false),
  }), [channelId, initialCompose]);
  const nickname = me?.user.nickname;
  useSendPreview(channelId, nickname, atoms.composeAtom);
  return (
    <ChannelAtomsContext.Provider value={atoms}>
      <PaneBox header={<ChannelHeader />}>
        <div className={clsx('flex-col justify-between flex flex-grow relative h-full')}>
          <ChatContent className="relative flex-grow flex-[1_1_100%]" me={me} channelId={channelId} />
          {me && member
            ? <Compose me={me} className={clsx('p-2 border-t flex-[1_0_auto]')} />
            : null}
        </div>
      </PaneBox>
    </ChannelAtomsContext.Provider>
  );
});
ChatPaneChannel.displayName = 'ChatPaneChannel';
