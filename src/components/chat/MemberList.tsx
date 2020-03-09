import React, { useRef, useState } from 'react';
import { Member } from '../../api/channels';
import { cls } from '../../classname';
import { AdminIcon, GmIcon } from '../icons';
import { Tooltip } from '../Tooltip';
import { UserCard } from './UserCard';

const MemberItem: React.FC<{ member: Member }> = ({ member }) => {
  const ref = useRef<HTMLLIElement | null>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <li
        className="text-sm px-2 py-1 hover:bg-teal-200 active:bg-teal-300 select-none cursor-pointer"
        ref={ref}
        onClick={() => setOpen(true)}
      >
        <span className={cls({ 'text-gray-500': !member.online }, 'mr-1 break-all')}>{member.user.nickname}</span>
        {member.channel.isMaster && (
          <Tooltip message={<div>主持人</div>}>
            <span className="inline-block rounded text-xs p-1">
              <GmIcon />
            </span>
          </Tooltip>
        )}
        {member.space.isAdmin && (
          <Tooltip message={<div>管理员</div>}>
            <span className="inline-block rounded text-xs p-1">
              <AdminIcon />
            </span>
          </Tooltip>
        )}
        <UserCard anchor={ref} id={member.user.id} open={open} dismiss={() => setOpen(false)} l />
      </li>
    </>
  );
};

interface Props {
  members: Member[];
}

export const MemberList = React.memo<Props>(({ members }) => {
  members.sort((a, b): number => {
    if (a.channel.isMaster !== b.channel.isMaster) {
      return Number(b.channel.isMaster) - Number(a.channel.isMaster);
    }
    if (a.online !== b.online) {
      return Number(b.online) - Number(a.online);
    }
    return a.channel.joinDate - b.channel.joinDate;
  });

  const items = members.map(member => <MemberItem key={member.user.id} member={member} />);
  return <ul>{items}</ul>;
});
