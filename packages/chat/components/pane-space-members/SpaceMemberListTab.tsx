import { FC } from 'react';
import { Loading } from 'ui/Loading';
import { useSpaceMembers } from '../../hooks/useSpaceMembers';
import { ErrorDisplay } from '../ErrorDisplay';

interface Props {
  spaceId: string;
}

export const SpaceMemberListTab: FC<Props> = ({ spaceId }) => {
  const { data: membersMap, error } = useSpaceMembers(spaceId);
  if (error != null) {
    return <ErrorDisplay error={error} type="block" />;
  }
  if (membersMap == null) {
    return <Loading />;
  }
  const members = Object.values(membersMap);
  return (
    <div>
      {members.map(member => <div className="p-4" key={member.user.id}>{member.user.nickname}</div>)}
    </div>
  );
};
