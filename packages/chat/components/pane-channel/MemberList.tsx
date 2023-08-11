import { Channel, Member } from 'api';
import { Mask, UserPlus } from 'icons';
import { FC, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from 'ui/Button';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import { useQueryUsersStatus } from '../../hooks/useQueryUsersStatus';
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

export const MemberList: FC<Props> = ({ className, myMember, channel }) => {
  const intl = useIntl();
  const [uiState, setUiState] = useState<'MEMBER' | 'INVITE'>('MEMBER');
  const { data: userStatusMap } = useQueryUsersStatus(channel.spaceId);
  const { data: membersData, error } = useQueryChannelMembers(channel.id);
  const [showCharaterName, setShowCharacterName] = useState(true);
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
    return <MemberListLoading className={className} />;
  }
  let canIKick = false;
  let myId: string | null = null;
  if (myMember != null) {
    canIKick = myMember.channel.isMaster || myMember.space.isAdmin;
    myId = myMember.user.id;
  }
  const showCharacterNameTitle = intl.formatMessage({
    defaultMessage: 'Show character name',
  });

  return (
    <div className={className}>
      <div className="overflow-y-auto h-full px-1 ">
        <div className="py-2 px-1 flex gap-1 justify-between">
          {myMember != null && (myMember.channel.isMaster || myMember.space.isAdmin) && (
            <Button
              data-small
              type="button"
              data-type="switch"
              data-on={uiState === 'INVITE'}
              onClick={toggleInvite}
            >
              <UserPlus />
              <FormattedMessage defaultMessage="Invite" />
            </Button>
          )}
          {uiState === 'MEMBER' && (
            <Button
              type="button"
              data-type="switch"
              data-on={showCharaterName}
              title={showCharacterNameTitle}
              onClick={() => setShowCharacterName(x => !x)}
            >
              <Mask />
            </Button>
          )}
        </div>
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
              showCharacterName={showCharaterName}
              status={userStatusMap?.[member.user.id]}
            />
          ))
        )}
      </div>
    </div>
  );
};
