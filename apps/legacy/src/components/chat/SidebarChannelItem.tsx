import { css } from '@emotion/react';
import styled from '@emotion/styled';
import * as React from 'react';
import { type Channel } from '../../api/channels';
import Lock from '../../assets/icons/lock.svg';
import { useSelector } from '../../store';
import { fontMono, mR, pY, textSm } from '../../styles/atoms';
import { gray } from '../../styles/colors';
import { chatPath } from '../../utils/path';
import Icon from '../atoms/Icon';
import { SidebarItemLink } from '../atoms/SidebarItem';

interface Props {
  channel: Channel;
}

const ChannelName = styled.div`
  position: relative;
  &::before {
    content: '#';
    ${fontMono};
    position: absolute;
    left: -1em;

    color: ${gray['500']};
  }
`;

const LatestText = styled.div`
  color: ${gray['600']};
  ${textSm};
`;

const NameText = styled.span`
  font-style: italic;
`;

const itemStyle = css`
  height: fit-content;
  align-items: flex-start;
  flex-direction: column;
  ${pY(3)};
`;

export function SidebarChannelItem({ channel }: Props) {
  const latestMessage = useSelector((state) => {
    return state.chatStates.get(channel.id)?.itemSet.messages.last();
  });
  let name: string | null = null;
  let text: string | null = null;
  if (latestMessage) {
    switch (latestMessage.type) {
      case 'MESSAGE':
        text = latestMessage.message.text;
        name = latestMessage.message.name;
        break;
      case 'PREVIEW':
        text = latestMessage.preview.text ?? null;
        name = latestMessage.preview.name;
        break;
    }
  }
  return (
    <SidebarItemLink css={itemStyle} to={chatPath(channel.spaceId, channel.id)}>
      <ChannelName>
        {!channel.isPublic && <Icon css={mR(1)} icon={Lock} />}
        {channel.name}
      </ChannelName>
      {channel.isPublic && name && text && (
        <LatestText>
          <NameText>{name}:</NameText> {text}
        </LatestText>
      )}
    </SidebarItemLink>
  );
}
