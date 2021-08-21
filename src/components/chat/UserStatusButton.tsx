import * as React from 'react';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from '../../store';
import Icon from '../atoms/Icon';
import members from '../../assets/icons/members.svg';
import ChatHeaderButton from './ChatHeaderButton';
import { HEARTBEAT_INTERVAL } from '../../settings';
import { Id } from '../../utils/id';
import { useSend } from '../../hooks/useSend';
import { usePane } from '../../hooks/usePane';
import Overlay from '../atoms/Overlay';
import ChatMemberList from './MemberList';
import { UserStatus } from '../../api/spaces';
import { useUsersStatus } from '../../hooks/useUsersStatus';

interface Props {
  className?: string;
  spaceId: Id;
  folded?: boolean;
  active: boolean;
  toggle: () => void;
}

export function isOnline(status: UserStatus | undefined | null): boolean {
  if (!status) {
    return false;
  }
  if (status.kind !== 'ONLINE') {
    return false;
  }
  const now = new Date().getTime();
  return now - status.timestamp < 10000;
}

function MemberListButton({ className, spaceId, folded, active, toggle }: Props) {
  const spaceResult = useSelector((state) => state.ui.spaceSet.get(spaceId));
  const totalCount = useMemo(() => (spaceResult?.isOk ? Object.keys(spaceResult.value.members).length : 0), [
    spaceResult,
  ]);
  const onlineCount = useMemo(
    () => (spaceResult?.isOk ? Object.values(spaceResult.value.usersStatus).filter(isOnline).length : 0),
    [spaceResult]
  );

  return (
    <ChatHeaderButton data-active={active} onClick={toggle} className={className}>
      <Icon sprite={members} />
      {!folded && (
        <Fragment>
          {onlineCount}
          <small>/{totalCount}</small>
        </Fragment>
      )}
    </ChatHeaderButton>
  );
}

export default React.memo(MemberListButton);
