import { useAtom } from 'jotai';
import React, { useCallback } from 'react';
import { userDialogAtom } from '../../states/userDialog';
import { useSelector } from '../../store';
import { overflowYAuto } from '../../styles/atoms';
import { type Id } from '../../utils/id';
import { SidebarMemberListItem } from './SidebarMemberListItem';
import { isOnline } from './UserStatusButton';

interface Props {
  spaceId: Id;
}

function SidebarMemberList({ spaceId }: Props) {
  const spaceResult = useSelector((state) => state.ui.spaceSet.get(spaceId));
  const [, setUserDialog] = useAtom(userDialogAtom);
  const handleClick = useCallback((userId: Id) => setUserDialog(userId), [setUserDialog]);
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
    memberList.push(
      <SidebarMemberListItem
        key={member.user.id}
        member={member}
        online={isOnline(status)}
        onClick={handleClick}
      />,
    );
  }
  return <div css={overflowYAuto}>{memberList}</div>;
}

export default React.memo(SidebarMemberList);
