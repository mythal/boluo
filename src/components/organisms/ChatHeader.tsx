import * as React from 'react';
import { useState } from 'react';
import { css } from '@emotion/core';
import { useSelector } from '@/store';
import {
  breakpoint,
  chatHeaderStyle,
  flex,
  fontBold,
  fontMono,
  mediaQuery,
  mL,
  mR,
  pR,
  textBase,
  textLg,
} from '@/styles/atoms';
import ChannelMemberButton from './ChannelMemberButton';
import sliders from '@/assets/icons/sliders.svg';
import ChatHeaderButton from '@/components/atoms/ChatHeaderButton';
import Icon from '@/components/atoms/Icon';
import ManageChannel from '@/components/organisms/ManageChannel';
import styled from '@emotion/styled';
import { darken } from 'polished';
import ChatFilter from '@/components/organisms/ChatFilter';
import { useTitle } from '@/hooks';
import MemberListButton from '@/components/molecules/MemberListButton';
import { textColor } from '@/styles/colors';

const Topic = styled.div`
  display: none;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  flex-shrink: 1;
  color: ${darken(0.2, textColor)};

  ${mediaQuery(breakpoint.md)} {
    display: inline-block;
    width: 14em;
  }

  ${mediaQuery(breakpoint.lg)} {
    width: 24em;
  }

  ${mediaQuery(breakpoint.xl)} {
    width: 32em;
  }
`;

const leftPart = css`
  ${[flex]};
  flex-shrink: 1;
  align-items: center;
  min-width: 0;
`;

const rightPart = css`
  ${[flex, mL(2)]};
  align-items: stretch;
`;

const ChannelName = styled.div`
  ${[textBase, fontBold, textLg]};
  color: ${textColor};
  display: none;
  ${pR(1)};
  ${mR(1)};
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 6em;

  ${mediaQuery(breakpoint.sm)} {
    display: inline-block;
    max-width: 6em;
  }
  ${mediaQuery(breakpoint.md)} {
    max-width: 12em;
  }
  ${mediaQuery(breakpoint.lg)} {
    max-width: 16em;
  }
  ${mediaQuery(breakpoint.xl)} {
    max-width: 24em;
  }

  &::before {
    content: '#';
    ${fontMono};
    color: ${darken(0.2, textColor)};
    ${[pR(1)]};
  }
`;

function ChatHeader() {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const channel = useSelector((state) => state.chat!.channel);
  const isSpaceAdmin = useSelector((state) => state.profile?.spaces.get(channel.spaceId)?.member.isAdmin);
  const [managePanel, setManagePanel] = useState(false);
  useTitle(channel.name);
  return (
    <div css={chatHeaderStyle}>
      <div css={leftPart}>
        <ChannelName>{channel.name}</ChannelName>
        <Topic>{channel.topic}</Topic>
      </div>
      <div css={rightPart}>
        {isSpaceAdmin && (
          <ChatHeaderButton onClick={() => setManagePanel(true)}>
            <Icon sprite={sliders} />
          </ChatHeaderButton>
        )}
        <ChatFilter css={[mL(1)]} />
        <MemberListButton channelId={channel.id} css={[mL(1)]} />
        <ChannelMemberButton css={mL(1)} />
      </div>
      {managePanel && <ManageChannel channel={channel} dismiss={() => setManagePanel(false)} />}
    </div>
  );
}

export default ChatHeader;
