import { Channel, Member, SpaceMemberWithUser, UserStatus } from 'api';
import { FC, ReactNode, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
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
  const intl = useIntl();
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
  let membersToInvite: ReactNode = <span>…</span>;
  if (spaceMemberList != null) {
    if (spaceMemberList.length > 0) {
      membersToInvite = spaceMemberList.map((member) => (
        <MemberInvitationItem
          key={member.user.id}
          user={member.user}
          channel={channel}
          spaceMember={member.space}
          status={userStatusMap?.[member.user.id]}
        />
      ));
    } else {
      membersToInvite = (
        <div className="px-1 text-sm text-surface-600">
          <FormattedMessage defaultMessage="No one to invite" />
        </div>
      );
    }
  }
  return (
    <div className="py-1 px-2">
      <label className="py-2 flex gap-2 items-center text-sm">
        <TextInput
          placeholder={intl.formatMessage({ defaultMessage: 'Search' })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
        />
      </label>
      <div>
        {membersToInvite}
      </div>
    </div>
  );
};
