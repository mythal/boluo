import * as React from 'react';
import { useState } from 'react';
import { type Channel } from '../../api/channels';
import { type Space, type SpaceMemberWithUser } from '../../api/spaces';
import UserCog from '@boluo/icons/legacy/UserCog';
import { useTitle } from '../../hooks/useTitle';
import { useSelector } from '../../store';
import { type Id } from '../../utils/id';
import Icon from '../atoms/Icon';
import JoinSpaceButton from '../molecules/JoinSpaceButton';
import LeaveSpaceButton from '../molecules/LeaveSpaceButton';
import ManageSpace from '../organisms/ManageSpace';
import ChatHeaderButton, { chatHeaderButtonClassName } from './ChatHeaderButton';
import { chatHeaderClassName } from './classNames';

interface Props {
  space: Space;
  members: Record<Id, SpaceMemberWithUser | undefined>;
  channels: Channel[];
}

function Home({ space, members, channels }: Props) {
  useTitle(space.name);

  const [managing, setManaging] = useState(false);
  const myMember = useSelector((state) => state.profile?.spaces.get(space.id)?.member);
  const startManage = () => setManaging(true);
  const stopManage = () => setManaging(false);
  return (
    <React.Fragment>
      <div className={chatHeaderClassName}>
        <div className="self-center whitespace-nowrap [grid-area:title]">
          <span className="overflow-hidden p-0 text-[1.125rem] font-bold whitespace-nowrap">
            {space.name}
          </span>
        </div>
        <div className="flex h-full [grid-area:toolbar]">
          {myMember?.isAdmin && (
            <ChatHeaderButton onClick={startManage}>
              <Icon icon={UserCog} /> 管理
            </ChatHeaderButton>
          )}
          {space.isPublic && (
            <JoinSpaceButton
              className={`${chatHeaderButtonClassName} legacy-chat-header-action`}
              size="small"
              id={space.id}
            />
          )}
          <LeaveSpaceButton
            className={`${chatHeaderButtonClassName} legacy-chat-header-action`}
            size="small"
            id={space.id}
            name={space.name}
          />
        </div>
      </div>
      <div className="border-legacy-gray-900 data-[active=true]:border-legacy-blue-800 [grid-row:list-start/compose-end] flex flex-col justify-between overflow-y-auto border md:flex-row">
        <div className="max-w-[30em] px-4 py-2 whitespace-pre-line">{space.description}</div>
      </div>
      {managing && myMember && (
        <ManageSpace
          space={space}
          channels={channels}
          members={members}
          my={myMember}
          dismiss={stopManage}
        />
      )}
    </React.Fragment>
  );
}

export default Home;
