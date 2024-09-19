import {
  autoUpdate,
  FloatingPortal,
  offset,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { type Channel, type MemberWithUser, type UserStatus } from '@boluo/api';
import clsx from 'clsx';
import { Mask } from '@boluo/icons';
import { type FC, useState } from 'react';
import Icon from '@boluo/ui/Icon';
import { Avatar } from '../account/Avatar';
import { GameMasterBadge } from './GameMasterBadge';
import { MemberCard } from './MemberCard';
import { MemberStatusBadge } from './MemberStatusBadge';

interface Props {
  member: MemberWithUser;
  channel: Channel;
  canIKick: boolean;
  canIEditMaster: boolean;
  status: UserStatus | undefined;
}

export const MemberListItem: FC<Props> = ({ member, canIKick, status, channel, canIEditMaster }) => {
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
          'grid grid-flow-col grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1',
          hasCharacterName ? 'grid-rows-2' : 'grid-rows-1',
          'hover:bg-surface-100 active:bg-surface-200 group relative w-full cursor-pointer rounded-sm px-2 py-1 text-sm',
        )}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        <div className="row-span-full h-8 w-8 flex-none">
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
              className={clsx(offline ? 'text-text-light' : hasCharacterName ? 'text-surface-600' : '', 'truncate')}
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
