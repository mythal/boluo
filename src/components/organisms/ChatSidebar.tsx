import * as React from 'react';
import { css } from '@emotion/core';
import { Channel } from '@/api/channels';
import ChatSidebarItem from '../molecules/ChatSidebarItem';

interface Props {
  channels: Channel[];
}

const container = css`
  background-color: brown;
  width: 200px;
  grid-area: sidebar;
`;

function ChatSidebar({ channels }: Props) {
  return (
    <div css={container}>
      <ul>
        {channels.map((channel) => (
          <ChatSidebarItem key={channel.id} channel={channel} />
        ))}
      </ul>
    </div>
  );
}

export default ChatSidebar;
