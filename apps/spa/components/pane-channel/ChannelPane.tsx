import clsx from 'clsx';
import { Lock, LockedHash } from '@boluo/icons';
import { useAtom } from 'jotai';
import { memo, type ReactNode, useMemo, type FC } from 'react';
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
import { ChannelSubPaneMemberList } from './ChannelSubPaneMemberList';
import { ChannelSubPaneSearch } from './ChannelSubPaneSearch';
import { FailedBanner } from '@boluo/ui/chat/FailedBanner';
import { PaneFailed } from '../pane-failed/PaneFailed';
import { ChannelContext } from '../../hooks/useChannel';
import { parseDiceFace } from '../../dice';
import { MemberContext, useMember } from '../../hooks/useMember';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import { GuestCompose } from '../compose/GuestCompose';
import { type Channel, ChannelMembers, type MemberWithUser } from '@boluo/api';
import { useBannerNode } from '../../hooks/useBannerNode';
import ReactDOM from 'react-dom';
import { useChannelFileDrop } from './useChannelFileDrop';
import { FileDropOverlay } from '@boluo/ui/chat/FileDropOverlay';
import { useQueryCurrentUser } from '@boluo/common/hooks/useQueryCurrentUser';

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
  errorNode: ReactNode;
}> = ({ channel, errorNode }) => {
  const member = useMember();
  const nickname = member?.user.nickname ?? undefined;
  const defaultCharacterName = member?.channel.characterName ?? '';
  const defaultInGame = channel?.type === 'IN_GAME';
  const atoms: ChannelAtoms = useMakeChannelAtoms(
    channel.id,
    defaultCharacterName,
    defaultInGame,
    parseDiceFace(channel?.defaultDiceType),
  );
  useSendPreview(
    channel.id,
    nickname,
    defaultCharacterName,
    atoms.composeAtom,
    atoms.parsedAtom,
    defaultInGame,
  );
  const [subPaneState, setSubPaneState] = useAtom(atoms.subPaneStateAtom);
  const { isDraggingFile, handleDragEnter, handleDragLeave, handleDragOver, handleDrop } =
    useChannelFileDrop({ composeAtom: atoms.composeAtom });
  const header = useMemo(() => {
    return <ChannelHeader />;
  }, []);

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
  const showMemberList = subPaneState === 'MEMBER_LIST';
  const showSearchPane = subPaneState === 'SEARCH';
  const hasRightPane = subPaneState !== 'NONE';
  return (
    <ChannelContext value={channel}>
      <ChannelAtomsContext value={atoms}>
        <PaneBox header={header} initSizeLevel={1}>
          {errorNode}
          <div
            className={clsx(
              'ChatPaneChannelView',
              'relative grid h-full grid-cols-1 grid-rows-[minmax(0,1fr)_auto]',
              hasRightPane && 'grid-cols-[1fr_auto]',
            )}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDraggingFile && member && <FileDropOverlay />}
            <ChatContent currentUserId={member?.user.id} />
            {showMemberList && (
              <ChannelSubPaneMemberList
                currentUser={member?.user}
                channel={channel}
                onClose={() => setSubPaneState('NONE')}
              />
            )}
            {showSearchPane && (
              <ChannelSubPaneSearch
                channelId={channel.id}
                onClose={() => setSubPaneState('NONE')}
              />
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
  );
};

export const ChatPaneChannel = memo(({ channelId }: Props) => {
  const {
    data: currentUser,
    isLoading: isCurrentUserLoading,
    error: queryCurrentUserError,
  } = useQueryCurrentUser();
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
  const banner = useBannerNode();
  const myMember = useMemo((): MemberWithUser | null => {
    if (members == null || members.members.length === 0 || currentUser == null) {
      return null;
    }
    const found = members.members.find((member) => member.user.id === currentUser.id);
    return found ?? null;
  }, [currentUser, members]);
  let errorNode = null;
  if (queryChannelError) {
    const title = <FormattedMessage defaultMessage="Failed to query the channel" />;
    errorNode = banner
      ? ReactDOM.createPortal(
          <FailedBanner error={queryChannelError}>{title}</FailedBanner>,
          banner,
        )
      : null;
  } else if (queryMembersError) {
    const title = <FormattedMessage defaultMessage="Failed to query the channel members" />;
    errorNode = banner
      ? ReactDOM.createPortal(
          <FailedBanner error={queryMembersError}>{title}</FailedBanner>,
          banner,
        )
      : null;
  }
  if (isChannelLoading || isMembersLoading || isCurrentUserLoading) {
    return <PaneLoading initSizeLevel={1}>{errorNode}</PaneLoading>;
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
  return (
    <MemberContext value={myMember}>
      <ChatPaneChannelView channel={channel} errorNode={errorNode} />
    </MemberContext>
  );
});
ChatPaneChannel.displayName = 'ChatPaneChannel';
