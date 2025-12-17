import {
  type Channel,
  type MemberWithUser,
  type SpaceMemberWithUser,
  type UserStatus,
} from '@boluo/api';
import { type FC, type ReactNode, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { TextInput } from '@boluo/ui/TextInput';
import { useQuerySpaceMembers } from '@boluo/hooks/useQuerySpaceMembers';
import { MemberInvitationItem } from './MemberInvitationItem';

interface Props {
  channel: Channel;
  userStatusMap: Record<string, UserStatus> | undefined;
  members: MemberWithUser[];
  myMember: MemberWithUser;
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
        <div className="text-text-secondary px-1 text-sm">
          <FormattedMessage defaultMessage="No one to invite" />
        </div>
      );
    }
  }
  return (
    <div className="px-2 py-1">
      <label className="flex items-center gap-2 py-2 text-sm">
        <TextInput
          placeholder={intl.formatMessage({ defaultMessage: 'Search' })}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full"
        />
      </label>
      <div>{membersToInvite}</div>
    </div>
  );
};
