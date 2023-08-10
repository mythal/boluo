import { ChannelMember, Member } from 'api';
import { Mask, UserPlus } from 'icons';
import { FC, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Button } from 'ui/Button';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import { MemberListItem } from './MemberListItem';

interface Props {
  className?: string;
  channelId: string;
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

export const MemberList: FC<Props> = ({ className, channelId, myMember }) => {
  const intl = useIntl();
  const { data: membersData, error } = useQueryChannelMembers(channelId);
  const [showCharaterName, setShowCharacterName] = useState(true);
  if (error) {
    // TODO: handle error
    return null;
  }
  if (!membersData) {
    return <MemberListLoading className={className} />;
  }
  const { members } = membersData;
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
            member={member}
            canIKick={canIKick}
            showCharacterName={showCharaterName}
          />
        ))}
      </div>
    </div>
  );
};
