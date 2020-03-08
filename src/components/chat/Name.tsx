import React, { useRef, useState } from 'react';
import { cls } from '../../classname';
import { Overlay } from '../Overlay';
import { Id } from '../../id';
import { useFetchResult } from '../../hooks';
import { get } from '../../api/request';
import { useChannelMember } from '../Provider';

const NameCard: React.FC<{ id: Id }> = ({ id }) => {
  const channelMemberList = useChannelMember();
  const [result] = useFetchResult(() => get('/users/query', { id }), [id]);
  if (result.isErr) {
    return <div className="text-gray-600 w-8 h-4">{result.value}</div>;
  }
  const user = result.value;
  if (user === null) {
    return <span className="text-gray-600">找不到用户</span>;
  }
  let isMaster = false;
  let isOnline = false;
  let isAdmin = false;
  if (channelMemberList) {
    const member = channelMemberList.find(member => member.user.id === id);
    if (member) {
      isMaster = member.channel.isMaster;
      isOnline = member.online;
      isAdmin = member.space.isAdmin;
    }
  }

  return (
    <div className="p-1">
      <div className="text-lg my-2">
        {user.nickname}
        {isMaster && <span className="inline-block p-1 ml-2 rounded bg-teal-300 text-xs">主持人</span>}
        {isOnline && <span className="inline-block p-1 ml-2 rounded bg-green-400 text-xs">在线</span>}
        {isAdmin && <span className="inline-block p-1 ml-2 rounded bg-blue-400 text-xs">管理员</span>}
      </div>
      <div className="text-sm">{user.bio}</div>
    </div>
  );
};

interface Props {
  name: string;
  userId: string;
  className?: string;
}

export const Name = React.memo<Props>(({ name, className, userId }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const dismiss = () => setOpen(false);

  return (
    <>
      <span className={cls('font-bold', className)} onClick={() => setOpen(true)}>
        <span ref={ref} className="inline-block hover:underline cursor-pointer">
          {name}
        </span>
        <Overlay open={open} dismiss={dismiss} anchor={ref} t>
          <div className="shadow-lg p-2 bg-white">
            <NameCard id={userId} />
          </div>
        </Overlay>
      </span>
    </>
  );
});
