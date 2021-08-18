import * as React from 'react';
import { useState } from 'react';
import { css } from '@emotion/core';
import styled from '@emotion/styled';
import { breakpoint, flex, fontBold, mediaQuery, mL, p, pX, pY, textLg } from '../../styles/atoms';
import { Space, SpaceMemberWithUser } from '../../api/spaces';
import { useDispatch, useSelector } from '../../store';
import Icon from '../atoms/Icon';
import ChatHeaderButton, { chatHeaderButtonStyle } from './ChatHeaderButton';
import Badge from '../atoms/Badge';
import userCog from '../../assets/icons/user-cog.svg';
import ManageSpace from '../organisms/ManageSpace';
import { Channel } from '../../api/channels';
import JoinSpaceButton from '../molecules/JoinSpaceButton';
import LeaveSpaceButton from '../molecules/LeaveSpaceButton';
import { useTitle } from '../../hooks/useTitle';
import { usePane } from '../../hooks/usePane';
import { chatPath } from '../../utils/path';
import { useHistory } from 'react-router-dom';
import { blue, gray } from '../../styles/colors';
import { chatHeaderStyle, chatHeaderToolbar } from './styles';
import { mix } from 'polished';
import MemberListItem from './MemberListItem';
import { Id } from '../../utils/id';

const Header = styled.div(chatHeaderStyle);

const container = css`
  grid-row: list-start / compose-end;
  display: flex;
  flex-direction: column;

  ${mediaQuery(breakpoint.md)} {
    flex-direction: row;
  }

  justify-content: space-between;
  overflow-y: auto;
  border: 1px solid ${gray['900']};

  &[data-active='true'] {
    border-color: ${blue['800']};
  }
`;

const memberList = css`
  flex: 1 1 16rem;
  min-width: 12rem;

  ${mediaQuery(breakpoint.md)} {
    max-width: 16rem;
  }
  background-color: ${mix(0.5, gray['900'], gray['800'])};
  overflow-y: auto;
  overflow-x: hidden;
`;

const Title = styled.div`
  grid-area: title;
  align-self: center;
  white-space: nowrap;
`;

const SpaceName = styled.span`
  ${[textLg, fontBold, p(0)]};
  white-space: nowrap;
  overflow: hidden;
`;

const Description = styled.div`
  max-width: 30em;
  white-space: pre-line;
  ${[pX(4), pY(2)]}
`;

interface Props {
  space: Space;
  members: Record<Id, SpaceMemberWithUser | undefined>;
  channels: Channel[];
}

const Buttons = styled.div`
  ${[chatHeaderToolbar, flex]};
`;

function Home({ space, members, channels }: Props) {
  useTitle(space.name);

  const dispatch = useDispatch();
  const history = useHistory();
  // const setActive = () => {
  //   if (!activePane) {
  //     dispatch({ type: 'SWITCH_ACTIVE_PANE', pane });
  //     history.replace(chatPath(space.id));
  //   }
  // };
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
          {space.isPublic && <JoinSpaceButton css={[mL(1), chatHeaderButtonStyle]} data-small id={space.id} />}
          <LeaveSpaceButton css={[mL(1), chatHeaderButtonStyle]} data-small id={space.id} name={space.name} />
        </Buttons>
      </Header>
      <div css={container}>
        <Description>{space.description}</Description>
        {/*<div css={memberList}>*/}
        {/*  {members.map((member) => (*/}
        {/*    <MemberListItem*/}
        {/*      key={member.user.id}*/}
        {/*      user={member.user}*/}
        {/*      spaceMember={member.space}*/}
        {/*      imAdmin={myMember?.isAdmin ?? false}*/}
        {/*      spaceOwnerId={space.ownerId}*/}
        {/*    />*/}
        {/*  ))}*/}
        {/*</div*/}
      </div>
      {managing && myMember && (
        <ManageSpace space={space} channels={channels} members={members} my={myMember} dismiss={stopManage} />
      )}
    </React.Fragment>
  );
}

export default Home;
