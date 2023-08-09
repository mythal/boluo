import clsx from 'clsx';
import { useMe } from 'common';
import { Lock } from 'icons';
import { atom } from 'jotai';
import { atomWithReducer, atomWithStorage } from 'jotai/utils';
import { FC, useMemo } from 'react';
import { memo } from 'react';
import { FormattedMessage } from 'react-intl';
import { ChannelAtoms, ChannelAtomsContext, ChannelFilter, ChannelMemberListState } from '../../hooks/useChannelAtoms';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { useQueryChannel } from '../../hooks/useQueryChannel';
import { composeReducer, makeInitialComposeState } from '../../state/compose.reducer';
import { Compose } from '../compose/Compose';
import { useSendPreview } from '../compose/useSendPreview';
import { PaneBox } from '../PaneBox';
import { PaneLoading } from '../PaneLoading';
import { ChannelHeader } from './ChannelHeader';
import { ChatContent } from './ChatContent';

interface Props {
  channelId: string;
}

const SecretChannelInfo: FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={className}>
      <div className="text-3xl pt-4">
        <Lock />
      </div>
      <div className="py-4">
        <FormattedMessage defaultMessage="This is a secret channel. You must be invited to join this channel." />
      </div>
    </div>
  );
};

export const ChatPaneChannel: FC<Props> = memo(({ channelId }) => {
  const me = useMe();
  const member = useMyChannelMember(channelId);
  const initialCompose = useMemo(makeInitialComposeState, []);
  const atoms: ChannelAtoms = useMemo(() => ({
    composeAtom: atomWithReducer(initialCompose, composeReducer),
    filterAtom: atomWithStorage<ChannelFilter>(`${channelId}:filter`, 'ALL'),
    showArchivedAtom: atomWithStorage(`${channelId}:show-archived`, false),
    memberListStateAtom: atom<ChannelMemberListState>('CLOSED'),
  }), [channelId, initialCompose]);
  const nickname = me != null && me !== 'LOADING' ? me.user.nickname : undefined;
  const { data: channel, isLoading } = useQueryChannel(channelId);
  useSendPreview(channelId, nickname, atoms.composeAtom);
  if (isLoading || member === 'LOADING') {
    return <PaneLoading />;
  }
  return (
    <ChannelAtomsContext.Provider value={atoms}>
      <PaneBox header={<ChannelHeader />}>
        <div className={clsx('flex-col justify-between flex flex-grow relative h-full')}>
          {member == null && channel != null && !channel.isPublic
            ? <SecretChannelInfo className="p-4" />
            : <ChatContent className="relative flex-grow flex-[1_1_100%]" me={me} channelId={channelId} />}
          {me && me !== 'LOADING' && member
            ? <Compose me={me} className={clsx('p-2 border-t flex-[1_0_auto]')} />
            : null}
        </div>
      </PaneBox>
    </ChannelAtomsContext.Provider>
  );
});
ChatPaneChannel.displayName = 'ChatPaneChannel';
