import { useQueryCurrentUser } from '@boluo/hooks/useQueryCurrentUser';
import { type FC, useMemo } from 'react';
import { Loading } from '@boluo/ui/Loading';
import { useQuerySpaceMembers } from '@boluo/hooks/useQuerySpaceMembers';
import { SpaceMemberListItem } from './SpaceMemberListItem';
import { Failed } from '@boluo/ui/Failed';
import { FormattedMessage } from 'react-intl';

interface Props {
  spaceId: string;
  spaceOwnerId: string | null | undefined;
}

export const SpaceMemberListTab: FC<Props> = ({ spaceId, spaceOwnerId }) => {
  const { data: membersMap, error } = useQuerySpaceMembers(spaceId);
  const { data: currentUser } = useQueryCurrentUser();
  const myId: string | null = currentUser?.id ?? null;
  const amIAdmin: boolean = useMemo(() => {
    if (myId == null) return false;
    if (spaceOwnerId === myId) return true;
    if (membersMap == null) return false;
    return membersMap[myId]?.space.isAdmin ?? false;
  }, [myId, membersMap, spaceOwnerId]);
  if (error != null && membersMap == null) {
    return (
      <Failed
        code={error.code}
        title={<FormattedMessage defaultMessage="Failed to query members of the space" />}
      />
    );
  }
  if (membersMap == null) {
    return <Loading />;
  }
  const members = Object.values(membersMap);
  return (
    <div className="py-4">
      {members.map((member) => (
        <SpaceMemberListItem
          myId={myId}
          amIAdmin={amIAdmin}
          key={member.user.id}
          member={member}
          spaceOwnerId={spaceOwnerId}
        />
      ))}
    </div>
  );
};
