import { autoUpdate, FloatingPortal, useClick, useDismiss, useFloating, useInteractions } from '@floating-ui/react';
import { Channel, Member, UserStatus } from 'api';
import { Mask } from 'icons';
import { FC, useState } from 'react';
import Icon from 'ui/Icon';
import { Avatar } from '../account/Avatar';
import { GameMasterBadge } from './GameMasterBadge';
import { MemberCard } from './MemberCard';
import { MemberStatusBadge } from './MemberStatusBadge';

interface Props {
  member: Member;
  myId: string | null;
  channel: Channel;
  canIKick: boolean;
  showCharacterName: boolean;
  canIEditMaster: boolean;
  status: UserStatus | undefined;
}

export const MemberListItem: FC<Props> = (
  { member, canIKick, myId, showCharacterName, status, channel, canIEditMaster },
) => {
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
  const { user, channel: channelMember } = member;

  return (
    <>
      <button
        className="group relative w-full text-left cursor-pointer flex items-start gap-1 text-sm rounded-sm p-1 hover:bg-surface-100 active:bg-surface-200"
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        <div className="w-6 h-6 flex-none">
          <Avatar size="1.5rem" name={user.nickname} id={user.id} avatarId={user.avatarId} className="rounded-sm" />
        </div>
        <span className="space-x-1">
          <span className={status == null || status.kind !== 'ONLINE' ? 'text-surface-500' : ''}>
            {showCharacterName && channelMember.characterName !== ''
              ? (
                <>
                  <Icon icon={Mask} /> {channelMember.characterName}
                </>
              )
              : user.nickname}
          </span>
          {channelMember.isMaster && <GameMasterBadge />}
          {status && <MemberStatusBadge status={status} />}
        </span>
      </button>
      {showMemberCard && (
        <FloatingPortal>
          <MemberCard
            ref={refs.setFloating}
            channel={channel}
            user={member.user}
            channelMember={member.channel}
            spaceMember={member.space}
            canIEditMaster={canIEditMaster}
            status={status}
            style={floatingStyles}
            canIKick={canIKick}
            {...getFloatingProps()}
          />
        </FloatingPortal>
      )}
    </>
  );
};
