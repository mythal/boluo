import React from 'react';
import { Id } from '../../id';
import { useChannelMember } from '../Provider';
import { useFetchResult } from '../../hooks';
import { get } from '../../api/request';
import { Overlay, Props as OverlayProps } from '../Overlay';
import { lastSeenIsOnline } from '../../helper';

const CardContent: React.FC<{ id: Id; lastSeen?: number }> = ({ id, lastSeen }) => {
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
      isOnline = lastSeenIsOnline(lastSeen);
      isAdmin = member.space.isAdmin;
    }
  }
  return (
    <div className="p-1">
      <div className="text-lg mb-2 ">
        {user.nickname}
        {isMaster && <span className="inline-block p-1 ml-2 rounded bg-teal-300 text-xs">主持人</span>}
        {isOnline && <span className="inline-block p-1 ml-2 rounded bg-green-300 text-xs">在线</span>}
        {isAdmin && <span className="inline-block p-1 ml-2 rounded bg-blue-300 text-xs">管理员</span>}
      </div>
      <div className="text-sm">{user.bio}</div>
    </div>
  );
};

export interface Props extends OverlayProps {
  id: Id;
  lastSeen?: number;
}

export const UserCard: React.FC<Props> = ({ id, anchor, open, dismiss, l, r, t, lastSeen }) => {
  return (
    <Overlay open={open} dismiss={dismiss} anchor={anchor} l={l} r={r} t={t}>
      <div className="shadow-xl p-2 bg-white w-64 border rounded">
        <CardContent id={id} lastSeen={lastSeen} />
      </div>
    </Overlay>
  );
};
