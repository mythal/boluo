import { Channel, Member, SpaceMemberWithUser, UserStatus } from 'api';
import { Filter } from 'icons';
import { FC, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from 'ui/Icon';
import { TextInput } from 'ui/TextInput';
import { useQuerySpaceMembers } from '../../hooks/useQuerySpaceMembers';
import { MemberInvitationItem } from './MemberInvitationItem';

interface Props {
  channel: Channel;
  userStatusMap: Record<string, UserStatus> | undefined;
  members: Member[];
  myMember: Member;
}

export const MemberInvitation: FC<Props> = ({ members, myMember, channel, userStatusMap }) => {
  const { data: spaceMembers } = useQuerySpaceMembers(myMember.space.spaceId);
  const [search, setSearch] = useState('');
  const spaceMemberList: SpaceMemberWithUser[] | null = useMemo(() => {
    if (spaceMembers == null) return null;
    return Object.values(spaceMembers).filter((spaceMember) => {
      const { user } = spaceMember;
      if (members.some((member) => member.user.id === user.id)) {
        return false;
      }

      return user.username.includes(search) || user.nickname.includes(search);
    });
  }, [members, search, spaceMembers]);
  return (
    <div className="p-1">
      <div className="font-bold">
        <FormattedMessage defaultMessage="Invite member" />
      </div>
      <label className="py-2 flex gap-2 items-center">
        <Icon icon={Filter} className="text-lg" />
        <TextInput value={search} onChange={(e) => setSearch(e.target.value)} className="w-full" />
      </label>
      <div>
        {spaceMemberList == null ? <span>...</span> : (
          spaceMemberList.map((member) => (
            <MemberInvitationItem
              key={member.user.id}
              user={member.user}
              channel={channel}
              spaceMember={member.space}
              status={userStatusMap?.[member.user.id]}
            />
          ))
        )}
      </div>
    </div>
  );
};
