import {
  autoUpdate,
  FloatingPortal,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { type Channel, type SpaceMember, type User, type UserStatus } from '@boluo/api';
import { type FC, useState } from 'react';
import { Avatar } from '../account/Avatar';
import { MemberCard } from './MemberCard';
import { MemberStatusBadge } from './MemberStatusBadge';

interface Props {
  user: User;
  channel: Channel;
  spaceMember: SpaceMember;
  status: UserStatus | undefined;
}

export const MemberInvitationItem: FC<Props> = ({ user, spaceMember, channel, status }) => {
  const [showMemberCard, setShowMemberCard] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open: showMemberCard,
    onOpenChange: setShowMemberCard,
    middleware: [],
    placement: 'left-start',
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context, {});
  const dismiss = useDismiss(context, {});
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        className="hover:bg-surface-100 active:bg-surface-200 group relative flex w-full cursor-pointer items-center gap-1 rounded-sm p-1 text-left text-sm"
      >
        <div className="h-6 w-6 flex-none">
          <Avatar
            size="1.5rem"
            name={user.nickname}
            id={user.id}
            avatarId={user.avatarId}
            className="rounded-sm"
          />
        </div>
        <span className="space-x-1">
          <span>{user.nickname}</span>
          {status && <MemberStatusBadge status={status} />}
        </span>
      </button>
      {showMemberCard && (
        <FloatingPortal>
          <MemberCard
            channel={channel}
            user={user}
            status={status}
            style={floatingStyles}
            spaceMember={spaceMember}
            canIInvite
            ref={refs.setFloating}
            {...getFloatingProps()}
          />
        </FloatingPortal>
      )}
    </>
  );
};
