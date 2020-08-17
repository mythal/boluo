import * as React from 'react';
import { useState } from 'react';
import { css } from '@emotion/core';
import styled from '@emotion/styled';
import { chatHeaderStyle, fontBold, mL, p, pX, pY, textLg } from '../../styles/atoms';
import { Space, SpaceMember } from '../../api/spaces';
import { useSelector } from '../../store';
import Icon from '../../components/atoms/Icon';
import ChatHeaderButton, { chatHeaderButtonStyle } from '../../components/atoms/ChatHeaderButton';
import Badge from '../../components/atoms/Badge';
import userCog from '../../assets/icons/user-cog.svg';
import ManageSpace from '../../components/organisms/ManageSpace';
import { Channel } from '../../api/channels';
import JoinSpaceButton from '../../components/molecules/JoinSpaceButton';
import LeaveSpaceButton from '../../components/molecules/LeaveSpaceButton';
import { useTitle } from '../../hooks/useTitle';

const Header = styled.div(chatHeaderStyle);

const container = css`
  grid-column: list-start / list-end;
  grid-row: list-start / compose-end;
  ${[pX(4), pY(4)]};
`;

const Title = styled.div`
  display: flex;
  align-items: center;
`;

const SpaceName = styled.span`
  ${[textLg, fontBold, p(0)]};
  white-space: nowrap;
  overflow: hidden;
`;

const Description = styled.div`
  max-width: 30em;
  white-space: pre-line;
`;

interface Props {
  space: Space;
  members: SpaceMember[];
  channels: Channel[];
}

const Buttons = styled.div`
  display: flex;
  align-items: stretch;
`;

function ChatHome({ space, members, channels }: Props) {
  useTitle(space.name);
  const [managing, setManaging] = useState(false);
  const myMember = useSelector((state) => state.profile?.spaces.get(space.id)?.member);
  const startManage = () => setManaging(true);
  const stopManage = () => setManaging(false);
  return (
    <React.Fragment>
      <Header>
        <Title>
          <SpaceName>{space.name}</SpaceName>
          <Badge css={mL(2)} color={'#375942'}>
            {members.length} 名成员
          </Badge>
        </Title>
        <Buttons>
          {myMember?.isAdmin && (
            <ChatHeaderButton onClick={startManage}>
              <Icon sprite={userCog} /> 管理
            </ChatHeaderButton>
          )}
          <JoinSpaceButton css={[mL(1), chatHeaderButtonStyle]} data-small id={space.id} />
          <LeaveSpaceButton css={[mL(1), chatHeaderButtonStyle]} data-small id={space.id} name={space.name} />
        </Buttons>
      </Header>
      <div css={container}>
        <Description>{space.description}</Description>
      </div>
      {managing && myMember && (
        <ManageSpace space={space} channels={channels} members={members} my={myMember} dismiss={stopManage} />
      )}
    </React.Fragment>
  );
}

export default ChatHome;
