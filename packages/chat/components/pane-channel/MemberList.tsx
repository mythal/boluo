import { UserPlus } from 'icons';
import { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { Button } from 'ui/Button';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import { MemberListItem } from './MemberListItem';

interface Props {
  className?: string;
  channelId: string;
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

export const MemberList: FC<Props> = ({ className, channelId }) => {
  const { data: membersData, error } = useQueryChannelMembers(channelId);
  if (error) {
    // TODO: handle error
    return null;
  }
  if (!membersData) {
    return <MemberListLoading className={className} />;
  }
  const { members } = membersData;
  return (
    <div className={className}>
      <div className="overflow-y-auto h-full px-1 border-l">
        <div className="py-2 px-1 flex gap-1">
          <Button data-small type="button" data-type="switch">
            <UserPlus />
            <FormattedMessage defaultMessage="Invite" />
          </Button>
        </div>
        {members.map((member) => <MemberListItem key={member.user.id} member={member} />)}
      </div>
    </div>
  );
};
