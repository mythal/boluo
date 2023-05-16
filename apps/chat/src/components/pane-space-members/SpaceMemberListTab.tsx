import { FC } from 'react';
import { useSpaceMembers } from '../../hooks/useSpaceMembers';

interface Props {
  spaceId: string;
}

export const SpaceMemberListTab: FC<Props> = ({ spaceId }) => {
  const membersMap = useSpaceMembers(spaceId);
  const members = Object.values(membersMap);
  return (
    <div>
      {members.map(member => <div className="p-4" key={member.user.id}>{member.user.nickname}</div>)}
    </div>
  );
};
