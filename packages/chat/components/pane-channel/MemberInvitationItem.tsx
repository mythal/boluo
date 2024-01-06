import { autoUpdate, FloatingPortal, useClick, useDismiss, useFloating, useInteractions } from '@floating-ui/react';
import { Channel, SpaceMember, User, UserStatus } from 'api';
import { FC, useState } from 'react';
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
        className="group relative w-full text-left cursor-pointer flex items-center gap-1 text-sm rounded-sm p-1 hover:bg-surface-100 active:bg-surface-200"
      >
        <div className="w-6 h-6 flex-none">
          <Avatar size="1.5rem" name={user.nickname} id={user.id} avatarId={user.avatarId} className="rounded-sm" />
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
