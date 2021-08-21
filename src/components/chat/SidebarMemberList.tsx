import { Id } from '../../utils/id';
import { useSelector } from '../../store';
import React, { Fragment } from 'react';
import { SidebarMemberListItem } from './SidebarMemberListItem';
import { overflowYAuto } from '../../styles/atoms';
import { isOnline } from './UserStatusButton';

interface Props {
  spaceId: Id;
}

export const SidebarMemberList = ({ spaceId }: Props) => {
  const spaceResult = useSelector((state) => state.ui.spaceSet.get(spaceId));
  if (!spaceResult || !spaceResult.isOk) {
    return null;
  }
  const { members, usersStatus } = spaceResult.value;
  if (!members) {
    return null;
  }
  const memberList = [];
  for (const member of Object.values(members)) {
    if (!member) {
      continue;
    }
    const status = usersStatus[member.user.id];
    memberList.push(<SidebarMemberListItem key={member.user.id} member={member} online={isOnline(status)} />);
  }
  return <div css={overflowYAuto}>{memberList}</div>;
};
