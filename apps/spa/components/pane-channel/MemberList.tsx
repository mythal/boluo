import { type User, type Channel, type MemberWithUser } from '@boluo/api';
import { UserPlus } from '@boluo/icons';
import { type FC, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import { useQueryUsersStatus } from '../../hooks/useQueryUsersStatus';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';
import { MemberInvitation } from './MemberInvitation';
import { MemberListItem } from './MemberListItem';
import { Failed } from '@boluo/ui/Failed';

interface Props {
  className?: string;
  channel: Channel;
  currentUser: User | undefined | null;
}

const MemberListLoading: FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={className}>
      <div className="p-2">…</div>
    </div>
  );
};

export const MemberList: FC<Props> = ({ currentUser, channel }) => {
  const intl = useIntl();
  const [uiState, setUiState] = useState<'MEMBER' | 'INVITE'>('MEMBER');
  const { data: userStatusMap } = useQueryUsersStatus(channel.spaceId);
  const { data: membersData, error } = useQueryChannelMembers(channel.id);
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
    return <MemberListLoading />;
  }
  let canIKick = false;
  let canInvite = false;
  if (myMember != null) {
    canIKick = myMember.channel.isMaster || myMember.space.isAdmin;
    canInvite = myMember.channel.isMaster || myMember.space.isAdmin;
  }

  return (
    <div className="border-border-subtle flex flex-col border-l">
      <div className="flex items-center justify-between px-2 py-1 text-sm">
        <span className="font-bold">
          {uiState === 'MEMBER' && <FormattedMessage defaultMessage="Members" />}
          {uiState === 'INVITE' && <FormattedMessage defaultMessage="Invite" />}
        </span>
        {canInvite && (
          <SidebarHeaderButton
            active={uiState === 'INVITE'}
            onClick={toggleInvite}
            title={intl.formatMessage({ defaultMessage: 'Invite' })}
          >
            <UserPlus />
          </SidebarHeaderButton>
        )}
      </div>

      <div className="overflow-y-auto">
        {uiState === 'INVITE' && myMember != null && (
          <MemberInvitation
            members={members}
            myMember={myMember}
            channel={channel}
            userStatusMap={userStatusMap}
          />
        )}
        {uiState === 'MEMBER' &&
          members.map((member) => (
            <MemberListItem
              key={member.user.id}
              channel={channel}
              member={member}
              canIKick={canIKick}
              canIEditMaster={myMember?.space.isAdmin ?? false}
              status={userStatusMap?.[member.user.id]}
            />
          ))}
      </div>
    </div>
  );
};
