import { type User, type Channel, type MemberWithUser } from '@boluo/api';
import { ChevronLeft, ChevronRight, UserPlus, X } from '@boluo/icons';
import { type FC, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import clsx from 'clsx';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import { useQueryUsersStatus } from '../../hooks/useQueryUsersStatus';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';
import { MemberInvitation } from './MemberInvitation';
import { MemberListItem } from './MemberListItem';
import { Failed } from '@boluo/ui/Failed';
import { atomWithStorage } from 'jotai/utils';
import { useAtom } from 'jotai';

interface Props {
  className?: string;
  channel: Channel;
  onClose: () => void;
  currentUser: User | undefined | null;
}

const MemberListLoading: FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={className}>
      <div className="p-2">…</div>
    </div>
  );
};

const miniMemberListAtom = atomWithStorage<boolean>('boluo:mini-member-list', true);

export const ChannelSubPaneMemberList: FC<Props> = ({ currentUser, channel, onClose }) => {
  const intl = useIntl();
  const [mini, setMini] = useAtom(miniMemberListAtom);
  const [openedMemberCardUserId, setOpenedMemberCardUserId] = useState<string | null>(null);
  const [uiState, setUiState] = useState<'MEMBER' | 'INVITE'>('MEMBER');
  if (mini && uiState === 'INVITE') {
    setUiState('MEMBER');
  }

  const { data: userStatusMap } = useQueryUsersStatus(channel.spaceId);
  const { data: membersData, error } = useQueryChannelMembers(channel.id);
  const containerClassName = clsx(
    'border-border-subtle bg-pane-bg inset-y-0 right-0 z-40 flex h-full flex-col border-l',
    mini ? '' : 'absolute shadow-xl w-3xs @xl:static @xl:shadow-none',
  );
  const toggleInvite = () => {
    setUiState((x) => (x === 'MEMBER' ? 'INVITE' : 'MEMBER'));
  };

  const members: MemberWithUser[] = useMemo(() => {
    if (membersData == null) {
      return [];
    }
    if (userStatusMap == null) {
      return membersData.members;
    }
    const members = [...membersData.members];
    members.sort((a, b) => {
      const idA = a.user.id;
      const idB = b.user.id;
      const statusA = userStatusMap[idA];
      const statusB = userStatusMap[idB];
      if (statusA == null) {
        return 1;
      }
      if (statusB == null) {
        return -1;
      }
      if (a.channel.isMaster && !b.channel.isMaster) {
        return -1;
      }
      if (statusA.kind === statusB.kind) {
        return a.user.username.localeCompare(b.user.username);
      } else if (statusA.kind === 'ONLINE') {
        return -1;
      } else if (statusB.kind === 'ONLINE') {
        return 1;
      } else {
        return a.user.username.localeCompare(b.user.username);
      }
    });
    return members;
  }, [membersData, userStatusMap]);
  const myMember: MemberWithUser | null = useMemo(() => {
    if (membersData == null || currentUser == null) {
      return null;
    }
    return membersData.members.find((member) => member.user.id === currentUser.id) ?? null;
  }, [currentUser, membersData]);
  if (error && membersData == null) {
    return (
      <div className="p-2">
        <Failed
          code={error.code}
          message={<FormattedMessage defaultMessage="Failed to query members of the channel" />}
        />
      </div>
    );
  }

  if (membersData == null) {
    return <MemberListLoading className={containerClassName} />;
  }
  let canIKick = false;
  let canInvite = false;
  if (myMember != null) {
    canIKick = myMember.channel.isMaster || myMember.space.isAdmin;
    canInvite = myMember.channel.isMaster || myMember.space.isAdmin;
  }

  return (
    <div className={containerClassName}>
      <div
        className={clsx(
          'border-border-subtle flex items-center border-b py-2 text-sm',
          mini ? 'px-2' : 'pr-2 pl-3',
        )}
      >
        <div className="grow">
          {!mini && uiState === 'MEMBER' && <FormattedMessage defaultMessage="Members" />}
          {!mini && uiState === 'INVITE' && <FormattedMessage defaultMessage="Invite" />}
        </div>
        {canInvite && !mini && (
          <PaneHeaderButton
            active={uiState === 'INVITE'}
            onClick={toggleInvite}
            title={intl.formatMessage({ defaultMessage: 'Invite' })}
          >
            <UserPlus />
          </PaneHeaderButton>
        )}

        <PaneHeaderButton
          onClick={() => setMini((x) => !x)}
          title={intl.formatMessage({ defaultMessage: 'Mini Member List' })}
        >
          {mini ? <ChevronLeft /> : <ChevronRight />}
        </PaneHeaderButton>
      </div>

      <div
        className={
          mini
            ? 'scrollbar-hidden overflow-x-hidden overflow-y-auto'
            : 'overflow-x-hidden overflow-y-auto'
        }
      >
        {uiState === 'INVITE' && myMember != null && (
          <MemberInvitation
            members={members}
            myMember={myMember}
            channel={channel}
            userStatusMap={userStatusMap}
          />
        )}
        {uiState === 'MEMBER' &&
          members.map((member) => {
            const isMemberCardOpen = openedMemberCardUserId === member.user.id;
            return (
              <MemberListItem
                key={member.user.id}
                channel={channel}
                isMemberCardOpen={isMemberCardOpen}
                setOpenedMemberCardUserId={setOpenedMemberCardUserId}
                mini={mini}
                member={member}
                canIKick={canIKick}
                canIEditMaster={myMember?.space.isAdmin ?? false}
                status={userStatusMap?.[member.user.id]}
              />
            );
          })}
      </div>
    </div>
  );
};
