import * as React from 'react';
import { Fragment, useMemo } from 'react';
import { UserStatus } from '../../api/spaces';
import members from '../../assets/icons/members.svg';
import { useSelector } from '../../store';
import { Id } from '../../utils/id';
import Icon from '../atoms/Icon';
import ChatHeaderButton from './ChatHeaderButton';

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
  return status.kind === 'ONLINE';
}

function MemberListButton({ className, spaceId, folded, active, toggle }: Props) {
  const spaceResult = useSelector((state) => state.ui.spaceSet.get(spaceId));
  const totalCount = useMemo(
    () => (spaceResult?.isOk ? Object.keys(spaceResult.value.members).length : 0),
    [spaceResult],
  );
  const onlineCount = useMemo(
    () => (spaceResult?.isOk ? Object.values(spaceResult.value.usersStatus).filter(isOnline).length : 0),
    [spaceResult],
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
