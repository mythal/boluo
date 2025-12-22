import {
  autoUpdate,
  FloatingPortal,
  offset,
  safePolygon,
  useClick,
  useDismiss,
  useFloating,
  useHover,
  useInteractions,
} from '@floating-ui/react';
import { type Channel, type MemberWithUser, type UserStatus } from '@boluo/api';
import clsx from 'clsx';
import Mask from '@boluo/icons/Mask';
import React, { type FC } from 'react';
import Icon from '@boluo/ui/Icon';
import { Avatar } from '@boluo/ui/users/Avatar';
import { GameMasterBadge } from './GameMasterBadge';
import { MemberCard } from './MemberCard';
import { useQueryAppSettings } from '@boluo/hooks/useQueryAppSettings';
import { LampOnline } from '@boluo/ui/LampOneline';

interface Props {
  member: MemberWithUser;
  channel: Channel;
  mini?: boolean;
  isMemberCardOpen: boolean;
  setOpenedMemberCardUserId: React.Dispatch<React.SetStateAction<string | null>>;
  canIKick: boolean;
  canIEditMaster: boolean;
  status: UserStatus | undefined;
}

export const MemberListItem: FC<Props> = ({
  member,
  canIKick,
  status,
  channel,
  canIEditMaster,
  mini = false,
  isMemberCardOpen,
  setOpenedMemberCardUserId,
}) => {
  const { data: appSettings } = useQueryAppSettings();
  const { refs, floatingStyles, context } = useFloating({
    open: isMemberCardOpen,
    onOpenChange: (open) => {
      if (open) {
        setOpenedMemberCardUserId(member.user.id);
      } else {
        setOpenedMemberCardUserId((prevUserId) =>
          prevUserId === member.user.id ? null : prevUserId,
        );
      }
    },
    middleware: [offset(4)],
    placement: 'left-start',
    whileElementsMounted: autoUpdate,
  });
  const click = useClick(context, {});
  const hover = useHover(context, {
    enabled: mini,
    delay: { open: 150, close: 0 },
    handleClose: safePolygon(),
  });
  const dismiss = useDismiss(context, {});
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, hover]);
  const { user, channel: channelMember } = member;
  const hasCharacterName = channelMember.characterName !== '';
  const offline = status == null || status.kind !== 'ONLINE';

  return (
    <>
      <button
        aria-pressed={isMemberCardOpen}
        className={clsx(
          'grid grid-flow-col items-center gap-x-1',
          hasCharacterName ? 'grid-rows-2' : 'grid-rows-1',
          'hover:bg-surface-muted pressed:bg-surface-interactive-active group relative w-full cursor-pointer py-1 text-sm',
          mini ? 'grid-cols-1 px-2' : 'grid-cols-[auto_minmax(0,1fr)_auto] px-3',
        )}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        <div className="relative row-span-full h-8 w-8 flex-none">
          <Avatar
            size="2rem"
            name={user.nickname}
            id={user.id}
            avatarId={user.avatarId}
            className="rounded-sm"
            mediaUrl={appSettings?.mediaUrl}
          />
          {status && <LampOnline isOn={status.kind === 'ONLINE'} />}
        </div>
        {!mini && (
          <>
            {hasCharacterName && (
              <span className={clsx(offline ? 'text-text-muted' : '', 'text-left', 'truncate')}>
                <Icon icon={Mask} /> {channelMember.characterName}
              </span>
            )}
            <span className={clsx(hasCharacterName ? '' : 'row-span-full', 'text-left')}>
              {
                <span
                  className={clsx(
                    offline ? 'text-text-secondary' : hasCharacterName ? 'text-text-secondary' : '',
                    'truncate',
                  )}
                >
                  {user.nickname}
                </span>
              }
            </span>
            <span className="row-span-full space-x-1">
              {channelMember.isMaster && <GameMasterBadge />}
            </span>
          </>
        )}
      </button>
      {isMemberCardOpen && (
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
