import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { type ChannelMember } from '../../api/channels';
import { type SpaceMember } from '../../api/spaces';
import { type User } from '../../api/users';
import { isOnline } from '../../utils/profile';
import Avatar from '../molecules/Avatar';
import MemberDialog from './MemberDialog';
import MemberTags from './MemberTags';

interface Props {
  user: User;
  channelMember?: ChannelMember;
  spaceMember: SpaceMember;
  timestamp?: number;
  imAdmin: boolean;
  spaceOwnerId?: string;
}

function MemberListItem({
  user,
  channelMember,
  spaceOwnerId,
  spaceMember,
  timestamp,
  imAdmin,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isShowCard, showCard] = useState(false);
  const dismiss = useCallback(() => {
    showCard(false);
  }, []);
  return (
    <React.Fragment>
      <div
        className="hover:bg-legacy-gray-800 data-[online=true]:bg-legacy-blue-800 data-[online=true]:hover:bg-legacy-blue-700 relative mx-1 my-1 flex min-w-56 cursor-pointer items-center rounded-[3px] px-2 py-2 select-none"
        ref={containerRef}
        data-online={isOnline(timestamp)}
        onClick={() => showCard(true)}
      >
        <Avatar className="rounded-[1px]" size="2.5rem" id={user.avatarId} />
        <div className="mx-2">
          <div>
            <span className="mr-1">{channelMember?.characterName || user.nickname}</span>
            <MemberTags
              spaceMember={spaceMember}
              channelMember={channelMember}
              spaceOwnerId={spaceOwnerId}
            />
          </div>
          <div className="text-legacy-gray-500 text-[0.875rem] leading-4">{user.username}</div>
        </div>
      </div>
    </React.Fragment>
  );
}

export default MemberListItem;
