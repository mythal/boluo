import { useMe } from 'common';
import { FC, useMemo } from 'react';
import { Loading } from 'ui/Loading';
import { useQuerySpaceMembers } from '../../hooks/useQuerySpaceMembers';
import { ErrorDisplay } from '../ErrorDisplay';
import { SpaceMemberListItem } from './SpaceMemberListItem';

interface Props {
  spaceId: string;
  spaceOwnerId: string | null | undefined;
}

export const SpaceMemberListTab: FC<Props> = ({ spaceId, spaceOwnerId }) => {
  const { data: membersMap, error } = useQuerySpaceMembers(spaceId);
  const me = useMe();
  const myId: string | null = me == null || me === 'LOADING' ? null : me.user.id;
  const amIAdmin: boolean = useMemo(() => {
    if (myId == null) return false;
    if (spaceOwnerId === myId) return true;
    if (membersMap == null) return false;
    return membersMap[myId]?.space.isAdmin ?? false;
  }, [myId, membersMap, spaceOwnerId]);
  if (error != null) {
    return <ErrorDisplay error={error} type="block" />;
  }
  if (membersMap == null) {
    return <Loading />;
  }
  const members = Object.values(membersMap);
  return (
    <div>
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
