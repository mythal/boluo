import { Channel, Member } from '@boluo/api';
import { UserPlus } from '@boluo/icons';
import { FC, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import { useQueryUsersStatus } from '../../hooks/useQueryUsersStatus';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';
import { MemberInvitation } from './MemberInvitation';
import { MemberListItem } from './MemberListItem';
import { MyChannelMemberResult } from '../../hooks/useMyChannelMember';
import { FailedBanner } from '../common/FailedBanner';

interface Props {
  className?: string;
  channel: Channel;
  myMember: MyChannelMemberResult;
}

const MemberListLoading: FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={className}>
      <div className="p-2">…</div>
    </div>
  );
};

export const MemberList: FC<Props> = ({ myMember, channel }) => {
  const intl = useIntl();
  const [uiState, setUiState] = useState<'MEMBER' | 'INVITE'>('MEMBER');
  const { data: userStatusMap } = useQueryUsersStatus(channel.spaceId);
  const { data: membersData, error } = useQueryChannelMembers(channel.id);
  const toggleInvite = () => {
    setUiState((x) => (x === 'MEMBER' ? 'INVITE' : 'MEMBER'));
  };

  const members: Member[] = useMemo(() => {
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
  if (error && membersData == null) {
    return (
      <FailedBanner error={error}>
        <FormattedMessage defaultMessage="Failed to query members of the channel" />
      </FailedBanner>
    );
  }

  if (membersData == null || (myMember.isErr && myMember.err === 'LOADING')) {
    return <MemberListLoading />;
  }
  const canIKick = myMember.isOk ? myMember.some.channel.isMaster || myMember.some.space.isAdmin : false;
  const canInvite = myMember.isOk && (myMember.some.channel.isMaster || myMember.some.space.isAdmin);

  return (
    <div className="border-surface-100 flex flex-col border-l">
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
        {uiState === 'INVITE' && myMember.isOk && (
          <MemberInvitation
            members={members}
            myMember={myMember.some}
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
              canIEditMaster={(myMember.isOk && myMember.some.space.isAdmin) ?? false}
              status={userStatusMap?.[member.user.id]}
            />
          ))}
      </div>
    </div>
  );
};
