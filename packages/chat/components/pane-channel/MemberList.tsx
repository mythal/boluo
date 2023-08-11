import { Channel, ChannelMember, Member } from 'api';
import { Mask, UserPlus } from 'icons';
import { FC, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from 'ui/Button';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import { useQueryUsersStatus } from '../../hooks/useQueryUsersStatus';
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
  const { data: userStatus } = useQueryUsersStatus(channel.spaceId);
  const { data: membersData, error } = useQueryChannelMembers(channel.id);
  const [showCharaterName, setShowCharacterName] = useState(true);

  const members: Member[] = useMemo(() => {
    if (membersData == null) {
      return [];
    }
    if (userStatus == null) {
      return membersData.members;
    }
    const members = [...membersData.members];
    members.sort((a, b) => {
      const idA = a.user.id;
      const idB = b.user.id;
      const statusA = userStatus[idA];
      const statusB = userStatus[idB];
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
  }, [membersData, userStatus]);
  if (error) {
    // TODO: handle error
    return null;
  }

  if (!membersData) {
    return <MemberListLoading className={className} />;
  }
  let canIKick = false;
  let myId: string | null = null;
  if (myMember != null && myMember !== 'LOADING') {
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
          <Button data-small type="button" data-type="switch">
            <UserPlus />
            <FormattedMessage defaultMessage="Invite" />
          </Button>
          <Button
            type="button"
            data-type="switch"
            data-on={showCharaterName}
            title={showCharacterNameTitle}
            onClick={() => setShowCharacterName(x => !x)}
          >
            <Mask />
          </Button>
        </div>
        {members.map((member) => (
          <MemberListItem
            key={member.user.id}
            myId={myId}
            channel={channel}
            member={member}
            canIKick={canIKick}
            showCharacterName={showCharaterName}
            status={userStatus?.[member.user.id]}
          />
        ))}
      </div>
    </div>
  );
};
