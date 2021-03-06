import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from '../../store';
import Icon from '../atoms/Icon';
import members from '../../assets/icons/members.svg';
import ChatHeaderButton from './ChatHeaderButton';
import { HEARTBEAT_INTERVAL } from '../../settings';
import { Id } from '../../utils/id';
import { isOnline } from '../../utils/profile';
import { useSend } from '../../hooks/useSend';
import { usePane } from '../../hooks/usePane';
import Overlay from '../atoms/Overlay';
import ChatMemberList from './MemberList';

interface Props {
  className?: string;
  channelId: Id;
}

function MemberListButton({ className, channelId }: Props) {
  const pane = usePane();
  const channelMembers = useSelector((state) => state.chatPane[pane]!.members);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const heartbeatMap = useSelector((state) => state.chatPane[pane]!.heartbeatMap);
  const myMember = useSelector((state) => state.profile?.channels.get(channelId)?.member);
  const send = useSend();
  const loggedIn = myMember !== undefined;
  useEffect(() => {
    const pulse = window.setInterval(() => {
      if (document.visibilityState === 'visible' && loggedIn) {
        send({ type: 'HEARTBEAT' });
      }
    }, HEARTBEAT_INTERVAL);
    return () => window.clearInterval(pulse);
  }, [send, loggedIn]);

  const now = new Date().getTime();
  const onlineCount = heartbeatMap.filter((time) => isOnline(time, now)).count();
  const toggle = useCallback(() => setOpen((value) => !value), []);
  return (
    <React.Fragment>
      <ChatHeaderButton data-active={open} onClick={toggle} className={className} ref={buttonRef}>
        <Icon sprite={members} /> {onlineCount}
        <small>/{channelMembers.length}</small>
      </ChatHeaderButton>
      {open && (
        <Overlay x={1} selfX={-1} y={1} anchor={buttonRef}>
          <ChatMemberList channelId={channelId} />
        </Overlay>
      )}
    </React.Fragment>
  );
}

export default React.memo(MemberListButton);
