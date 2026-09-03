import React from 'react';
import { type SpaceMemberWithUser } from '../../api/spaces';
import { type Id } from '../../utils/id';

interface Props {
  member: SpaceMemberWithUser;
  online: boolean;
  onClick: (userId: Id) => void;
}

export const SidebarMemberListItem = ({ member, online, onClick }: Props) => {
  return (
    <div
      className="text-legacy-gray-700 before:bg-legacy-green-400 hover:bg-legacy-gray-800 data-[online=true]:text-legacy-gray-200 relative flex items-center py-4 pl-8 before:absolute before:left-[1em] before:hidden before:size-[0.5em] before:rounded-full before:content-[''] data-[online=true]:before:inline-block"
      data-online={String(online)}
      onClick={() => onClick(member.user.id)}
    >
      {member.user.username}
    </div>
  );
};
