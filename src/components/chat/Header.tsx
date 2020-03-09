import React from 'react';
import { Chat } from '../../states/chat';
import { JoinChannelButton } from '../JoinChannelButton';
import { MemberIcon } from '../icons';
import { cls } from '../../classname';

interface Props {
  chat: Chat;
  toggleMemberList: () => void;
  isMemberListOpen: boolean;
}

export const Header = React.memo<Props>(({ chat, isMemberListOpen, toggleMemberList }) => {
  return (
    <div className="p-2 border-b h-14 flex items-center justify-between">
      <div className="text-lg">{chat.channel.name}</div>
      <div>
        <JoinChannelButton className="text-xs p-1 h-8" channel={chat.channel} />
        <button
          onClick={toggleMemberList}
          className={cls('btn h-8 text-xs p-1 ml-1', { 'btn-down': isMemberListOpen })}
        >
          <MemberIcon />
        </button>
      </div>
    </div>
  );
});
