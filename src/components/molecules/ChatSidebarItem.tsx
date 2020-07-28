import * as React from 'react';
import { Channel } from '../../api/channels';
import { Link } from 'react-router-dom';
import { channelChatPath } from '../../utils/path';
import { css } from '@emotion/core';
import { textColor } from '../../styles/atoms';

interface Props {
  channel: Channel;
}

const linkStyle = css`
  text-decoration: none;
  color: ${textColor};
`;

function ChatSidebarItem({ channel }: Props) {
  return (
    <li>
      <Link css={linkStyle} to={channelChatPath(channel.spaceId, channel.id)}>
        {channel.name}
      </Link>
    </li>
  );
}

export default ChatSidebarItem;
