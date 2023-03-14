import { FC } from 'react';
import { useSpaceMembers } from '../../hooks/useSpaceMembers';
import { PaneBodyBox } from '../PaneBodyBox';

interface Props {
  spaceId: string;
}

export const SpaceMemberListTab: FC<Props> = ({ spaceId }) => {
  const membersMap = useSpaceMembers(spaceId);
  const members = Object.values(membersMap);
  return (
    <PaneBodyBox className="">
      {members.map(member => <div className="p-4" key={member.user.id}>{member.user.nickname}</div>)}
    </PaneBodyBox>
  );
};
