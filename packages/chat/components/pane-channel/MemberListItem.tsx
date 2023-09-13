import {
  autoUpdate,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { Channel, Member, UserStatus } from 'api';
import clsx from 'clsx';
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
  canIEditMaster: boolean;
  status: UserStatus | undefined;
}

export const MemberListItem: FC<Props> = (
  { member, canIKick, myId, status, channel, canIEditMaster },
) => {
  const [showMemberCard, setShowMemberCard] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open: showMemberCard,
    onOpenChange: setShowMemberCard,
    middleware: [offset(4)],
    placement: 'left-start',
    whileElementsMounted: autoUpdate,
  });
  const click = useClick(context, {});
  const dismiss = useDismiss(context, {});
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);
  const { user, channel: channelMember } = member;
  const hasCharacterName = channelMember.characterName !== '';
  const offline = status == null || status.kind !== 'ONLINE';

  return (
    <>
      <button
        className={clsx(
          'grid gap-x-1 items-center grid-cols-[auto_minmax(0,1fr)_auto] grid-flow-col',
          hasCharacterName ? 'grid-rows-2' : 'grid-rows-1',
          'group relative w-full cursor-pointer  text-sm rounded-sm px-2 py-1 hover:bg-surface-100 active:bg-surface-200',
        )}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        <div className="w-8 h-8 flex-none row-span-full">
          <Avatar size="2rem" name={user.nickname} id={user.id} avatarId={user.avatarId} className="rounded-sm" />
        </div>
        {hasCharacterName && (
          <span className={clsx(offline ? 'text-surface-500' : '', 'text-left', 'truncate')}>
            <Icon icon={Mask} /> {channelMember.characterName}
          </span>
        )}
        <span className={clsx(hasCharacterName ? '' : 'row-span-full', 'text-left')}>
          {
            <span
              className={clsx(offline ? 'text-surface-400' : (hasCharacterName ? 'text-surface-600' : ''), 'truncate')}
            >
              {user.nickname}
            </span>
          }
        </span>
        <span className="row-span-full space-x-1">
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
