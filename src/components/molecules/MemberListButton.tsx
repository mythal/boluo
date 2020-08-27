import * as React from 'react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from '../../store';
import { toggleMemberList } from '../../actions/chat';
import Icon from '../../components/atoms/Icon';
import members from '../../assets/icons/members.svg';
import ChatHeaderButton from '../../components/atoms/ChatHeaderButton';
import { HEARTBEAT_INTERVAL } from '../../settings';
import { Id } from '../../utils/id';
import { isOnline } from '../../utils/profile';
import { useSend } from '../../hooks/useSend';
import { usePane } from '../../hooks/usePane';

interface Props {
  className?: string;
  channelId: Id;
}

function MemberListButton({ className, channelId }: Props) {
  const pane = usePane();
  const channelMembers = useSelector((state) => state.chatPane[pane]!.members);
  const open = useSelector((state) => state.chatPane[pane]!.memberList);
  const heartbeatMap = useSelector((state) => state.chatPane[pane]!.heartbeatMap);
  const myMember = useSelector((state) => state.profile?.channels.get(channelId)?.member);
  const dispatch = useDispatch();
  const send = useSend();
  useEffect(() => {
    const pulse = window.setInterval(() => {
      if (document.visibilityState === 'visible' && myMember) {
        send({ type: 'HEARTBEAT' });
      }
    }, HEARTBEAT_INTERVAL);
    return () => window.clearInterval(pulse);
  }, [send, myMember]);

  const now = new Date().getTime();
  const onlineCount = heartbeatMap.filter((time) => isOnline(time, now)).count();
  return (
    <ChatHeaderButton data-active={open} onClick={() => dispatch(toggleMemberList(pane))} className={className}>
      <Icon sprite={members} /> {onlineCount}
      <small>/{channelMembers.length}</small>
    </ChatHeaderButton>
  );
}

export default MemberListButton;
