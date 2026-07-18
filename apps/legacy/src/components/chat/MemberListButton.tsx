import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Members from '../../assets/icons/members.svg';
import { useChannelId } from '../../hooks/useChannelId';
import { useSelector } from '../../store';
import { type Id } from '../../utils/id';
import Icon from '../atoms/Icon';
import ChatHeaderButton from './ChatHeaderButton';

interface Props {
  className?: string;
  channelId: Id;
}

function MemberListButton({ className }: Props) {
  const pane = useChannelId();
  const channelMembers = useSelector((state) => state.chatStates.get(pane)!.members);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const onlineCount = 0;
  const toggle = useCallback(() => setOpen((value) => !value), []);
  return (
    <React.Fragment>
      <ChatHeaderButton data-active={open} onClick={toggle} className={className} ref={buttonRef}>
        <Icon icon={Members} /> {onlineCount}
        <small>/{channelMembers.length}</small>
      </ChatHeaderButton>
    </React.Fragment>
  );
}

export default React.memo(MemberListButton);
