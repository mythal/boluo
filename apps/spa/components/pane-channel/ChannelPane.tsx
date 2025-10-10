import clsx from 'clsx';
import { Lock, LockedHash } from '@boluo/icons';
import { useAtomValue } from 'jotai';
import { ReactNode, useMemo, type FC } from 'react';
import { memo } from 'react';
import { FormattedMessage } from 'react-intl';
import {
  type ChannelAtoms,
  ChannelAtomsContext,
  useMakeChannelAtoms,
} from '../../hooks/useChannelAtoms';
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
import { Channel, ChannelMembers, type MemberWithUser } from '@boluo/api';

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

const ChatPaneChannelView: FC<{
  channel: Channel;
  members: ChannelMembers | null;
  errorNode: ReactNode;
}> = ({ channel, members, errorNode }) => {
  const member: MemberWithUser | null = useMemo(() => {
    if (members == null) {
      return null;
    }
    const { selfIndex } = members;
    if (selfIndex == null) {
      return null;
    }
    return members.members[selfIndex] ?? null;
  }, [members]);
  const nickname = member?.user.nickname ?? undefined;
  const characterName = member?.channel.characterName ?? '';
  const defaultInGame = channel?.type === 'IN_GAME';
  const atoms: ChannelAtoms = useMakeChannelAtoms(
    channel.id,
    characterName,
    defaultInGame,
    parseDiceFace(channel?.defaultDiceType),
  );
  useSendPreview(
    channel.id,
    nickname,
    characterName,
    atoms.composeAtom,
    atoms.parsedAtom,
    defaultInGame,
  );
  const memberListState = useAtomValue(atoms.memberListStateAtom);

  const iAmMember = member?.channel.channelId === channel.id;
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
    <MemberContext value={member}>
      <ChannelContext value={channel}>
        <ChannelAtomsContext value={atoms}>
          <PaneBox header={<ChannelHeader />} grow>
            {errorNode}
            <div
              className={clsx(
                'relative grid h-full grid-rows-[minmax(0,1fr)_auto]',
                memberListState === 'CLOSED'
                  ? 'grid-cols-1'
                  : 'grid-cols-[1fr_10rem] @2xl:grid-cols-[1fr_14rem]',
              )}
            >
              <ChatContent />
              {memberListState === 'RIGHT' && (
                <MemberList currentUser={member?.user} channel={channel} />
              )}
              {member ? (
                <Compose channelAtoms={atoms} member={member} />
              ) : (
                <GuestCompose channelId={channel.id} spaceId={channel.spaceId} />
              )}
            </div>
          </PaneBox>
        </ChannelAtomsContext>
      </ChannelContext>
    </MemberContext>
  );
};

export const ChatPaneChannel = memo(({ channelId }: Props) => {
  const {
    data: members,
    isLoading: isMembersLoading,
    error: queryMembersError,
  } = useQueryChannelMembers(channelId);
  const {
    data: channel,
    isLoading: isChannelLoading,
    error: queryChannelError,
  } = useQueryChannel(channelId);
  let errorNode = null;
  if (queryChannelError) {
    const title = <FormattedMessage defaultMessage="Failed to query the channel" />;
    errorNode = <FailedBanner error={queryChannelError}>{title}</FailedBanner>;
  } else if (queryMembersError) {
    const title = <FormattedMessage defaultMessage="Failed to query the channel members" />;
    errorNode = <FailedBanner error={queryMembersError}>{title}</FailedBanner>;
  }
  if (isChannelLoading || isMembersLoading) {
    return <PaneLoading grow>{errorNode}</PaneLoading>;
  }
  if (channel == null) {
    return (
      <PaneFailed
        code={queryChannelError?.code}
        title={<FormattedMessage defaultMessage="Failed to query the channel" />}
        message={
          <FormattedMessage defaultMessage="Please check your network connection and try again." />
        }
      />
    );
  }
  return <ChatPaneChannelView channel={channel} members={members || null} errorNode={errorNode} />;
});
ChatPaneChannel.displayName = 'ChatPaneChannel';
