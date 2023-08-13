import clsx from 'clsx';
import { useMe } from 'common';
import { Lock, LockedHash } from 'icons';
import { atom, useAtomValue } from 'jotai';
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
import { ErrorDisplay } from '../ErrorDisplay';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { PaneLoading } from '../PaneLoading';
import { ChannelHeader } from './ChannelHeader';
import { ChatContent } from './ChatContent';
import { MemberList } from './MemberList';

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
  const { data: channel, isLoading, error } = useQueryChannel(channelId);
  useSendPreview(channelId, nickname, atoms.composeAtom);
  const memberListState = useAtomValue(atoms.memberListStateAtom);
  if (error) {
    return (
      <div className="p-4">
        <ErrorDisplay error={error} />
      </div>
    );
  }
  if (channel == null || (!channel.isPublic && member === 'LOADING')) {
    return <PaneLoading />;
  }
  if (!channel.isPublic && member == null) {
    return (
      <PaneBox
        header={
          <PaneHeaderBox icon={<LockedHash />}>
            <FormattedMessage defaultMessage="Secret Channel" />
          </PaneHeaderBox>
        }
      >
        <SecretChannelInfo className="p-4" />
      </PaneBox>
    );
  }
  return (
    <ChannelAtomsContext.Provider value={atoms}>
      <PaneBox header={<ChannelHeader />}>
        <div
          className={clsx(
            'grid grid-rows-[1fr_auto] relative h-full',
            memberListState === 'CLOSED' ? 'grid-cols-1' : 'grid-cols-[1fr_auto]',
          )}
        >
          <ChatContent className="relative" me={me} channelId={channelId} />
          {memberListState === 'RIGHT' && (
            <MemberList myMember={member} className="w-[12rem] overflow-y-auto relative" channel={channel} />
          )}
          {me && me !== 'LOADING' && member
            ? <Compose me={me} className={clsx('p-2 border-t col-span-full')} />
            : null}
        </div>
      </PaneBox>
    </ChannelAtomsContext.Provider>
  );
});
ChatPaneChannel.displayName = 'ChatPaneChannel';
