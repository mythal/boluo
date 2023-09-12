import { Channel, Member } from 'api';
import { Mask, UserPlus } from 'icons';
import { FC, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from 'ui/Button';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import { useQueryUsersStatus } from '../../hooks/useQueryUsersStatus';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';
import { MemberInvitation } from './MemberInvitation';
import { MemberListItem } from './MemberListItem';

interface Props {
  className?: string;
  channel: Channel;
  myMember: Member | 'LOADING' | null;
}

const MemberListLoading: FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={className}>
      <div className="p-2">
        …
      </div>
    </div>
  );
};

export const MemberList: FC<Props> = ({ myMember, channel }) => {
  const intl = useIntl();
  const [uiState, setUiState] = useState<'MEMBER' | 'INVITE'>('MEMBER');
  const { data: userStatusMap } = useQueryUsersStatus(channel.spaceId);
  const { data: membersData, error } = useQueryChannelMembers(channel.id);
  const toggleInvite = () => {
    setUiState(x => x === 'MEMBER' ? 'INVITE' : 'MEMBER');
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
  if (error) {
    // TODO: handle error
    return null;
  }

  if (membersData == null || myMember === 'LOADING') {
    return <MemberListLoading />;
  }
  let canIKick = false;
  let myId: string | null = null;
  if (myMember != null) {
    canIKick = myMember.channel.isMaster || myMember.space.isAdmin;
    myId = myMember.user.id;
  }

  const canInvite = myMember != null && (myMember.channel.isMaster || myMember.space.isAdmin);

  return (
    <div className="flex flex-col border-l border-surface-100">
      <div className="text-sm px-2 flex justify-between items-center py-1">
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
        {uiState === 'MEMBER' && (
          members.map((member) => (
            <MemberListItem
              key={member.user.id}
              myId={myId}
              channel={channel}
              member={member}
              canIKick={canIKick}
              canIEditMaster={myMember?.space.isAdmin ?? false}
              status={userStatusMap?.[member.user.id]}
            />
          ))
        )}
      </div>
    </div>
  );
};
