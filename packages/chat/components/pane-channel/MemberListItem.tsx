import { autoUpdate, FloatingPortal, useClick, useDismiss, useFloating, useInteractions } from '@floating-ui/react';
import { Member } from 'api';
import clsx from 'clsx';
import { Mask, X } from 'icons';
import { FC, MouseEventHandler, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from 'ui/Icon';
import { usePaneAdd } from '../../hooks/usePaneAdd';
import { Avatar } from '../account/Avatar';
import { MemberCard } from './MemberCard';

interface Props {
  member: Member;
  myId: string | null;
  canIKick: boolean;
  showCharacterName: boolean;
}

export const MemberListItem: FC<Props> = (
  { member, canIKick, myId, showCharacterName },
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
  const { user, space: spaceMember, channel: channelMember } = member;
  const isMe = myId != null && user.id === myId;
  const addPane = usePaneAdd();

  return (
    <>
      <button
        className="group relative w-full text-left cursor-pointer flex items-start gap-1 text-sm rounded-sm p-1 hover:bg-surface-100 active:bg-surface-200"
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        <div className="w-6 h-6 flex-none">
          <Avatar size="1.5rem" name={user.nickname} id={user.id} avatarId={user.avatarId} />
        </div>
        <span className="flex-1">
          {showCharacterName && channelMember.characterName !== ''
            ? (
              <span>
                <Icon icon={Mask} /> {channelMember.characterName}
              </span>
            )
            : user.nickname}
          {isMe && (
            <span className="text-surface-500 bg-surface-200/50 mx-1 px-1 rounded">
              <FormattedMessage defaultMessage="me" />
            </span>
          )}
        </span>
      </button>
      {showMemberCard && (
        <FloatingPortal>
          <MemberCard
            ref={refs.setFloating}
            className="absolute -translate-x-full"
            member={member}
            style={floatingStyles}
            canIKick={canIKick}
            {...getFloatingProps()}
          />
        </FloatingPortal>
      )}
    </>
  );
};
