import clsx from 'clsx';
import { useQueryCurrentUser } from '@boluo/common';
import { Lock, LockedHash } from '@boluo/icons';
import { useAtomValue } from 'jotai';
import { useMemo, type FC } from 'react';
import { memo } from 'react';
import { FormattedMessage } from 'react-intl';
import { type ChannelAtoms, ChannelAtomsContext, useMakeChannelAtoms } from '../../hooks/useChannelAtoms';
import { useQueryChannel } from '../../hooks/useQueryChannel';
import { Compose } from '../compose/Compose';
import { useSendPreview } from '../compose/useSendPreview';
import { PaneBox } from '../PaneBox';
import { PaneHeaderBox } from '../PaneHeaderBox';
import { PaneLoading } from '../PaneLoading';
import { ChannelHeader } from './ChannelHeader';
import { ChatContent } from './ChatContent';
import { MemberList } from './MemberList';
import { FailedBanner } from '../common/FailedBanner';
import { PaneFailed } from '../pane-failed/PaneFailed';
import { ChannelContext } from '../../hooks/useChannel';
import { parseDiceFace } from '../../dice';
import { MemberContext } from '../../hooks/useMember';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import { GuestCompose } from '../compose/GuestCompose';

interface Props {
  channelId: string;
}

const SecretChannelInfo: FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={className}>
      <div className="pt-4 text-3xl">
        <Lock />
      </div>
      <div className="py-4">
        <FormattedMessage defaultMessage="This is a secret channel. You must be invited to join this channel." />
      </div>
    </div>
  );
};

export const ChatPaneChannel: FC<Props> = memo(({ channelId }) => {
  const { data: currentUser } = useQueryCurrentUser();
  const { data: members } = useQueryChannelMembers(channelId, {});
  const member = useMemo(
    () => members?.members.find((member) => member.user.id === currentUser?.id) ?? null,
    [members, currentUser],
  );
  const nickname = currentUser?.nickname ?? undefined;
  const characterName = member?.channel.characterName ?? '';
  const { data: channel, isLoading: isChannelLoading, error: queryChannelError } = useQueryChannel(channelId);
  const defaultInGame = channel?.type === 'IN_GAME';
  const atoms: ChannelAtoms = useMakeChannelAtoms(
    channelId,
    characterName,
    defaultInGame,
    parseDiceFace(channel?.defaultDiceType),
  );
  useSendPreview(channelId, nickname, characterName, atoms.composeAtom, atoms.parsedAtom, defaultInGame);
  const memberListState = useAtomValue(atoms.memberListStateAtom);
  let errorNode = null;
  if (queryChannelError) {
    const title = <FormattedMessage defaultMessage="Failed to query the channel" />;
    errorNode = <FailedBanner error={queryChannelError}>{title}</FailedBanner>;
  }
  if (isChannelLoading) {
    return <PaneLoading grow>{errorNode}</PaneLoading>;
  }

  if (channel == null) {
    return (
      <PaneFailed
        error={queryChannelError}
        title={<FormattedMessage defaultMessage="Failed to query the channel" />}
        message={<FormattedMessage defaultMessage="Please check your network connection and try again." />}
      />
    );
  }
  const iAmMember = member?.channel.channelId === channelId;
  if (!channel.isPublic && (member == null || !iAmMember)) {
    return (
      <PaneBox
        header={
          <PaneHeaderBox icon={<LockedHash />}>
            <FormattedMessage defaultMessage="Secret Channel" />
          </PaneHeaderBox>
        }
      >
        {errorNode}
        <SecretChannelInfo className="p-4" />
      </PaneBox>
    );
  }
  return (
    <MemberContext.Provider value={member}>
      <ChannelContext.Provider value={channel}>
        <ChannelAtomsContext.Provider value={atoms}>
          <PaneBox header={<ChannelHeader />} grow>
            {errorNode}
            <div
              className={clsx(
                'relative grid h-full grid-rows-[minmax(0,1fr)_auto]',
                memberListState === 'CLOSED' ? 'grid-cols-1' : '@2xl:grid-cols-[1fr_14rem] grid-cols-[1fr_10rem]',
              )}
            >
              <ChatContent />
              {memberListState === 'RIGHT' && <MemberList currentUser={currentUser} channel={channel} />}
              {member ? <Compose channelAtoms={atoms} member={member} /> : <GuestCompose />}
            </div>
          </PaneBox>
        </ChannelAtomsContext.Provider>
      </ChannelContext.Provider>
    </MemberContext.Provider>
  );
});
ChatPaneChannel.displayName = 'ChatPaneChannel';
