import { css } from '@emotion/react';
import styled from '@emotion/styled';
import * as React from 'react';
import { useState } from 'react';
import { type Channel } from '../../api/channels';
import { type Space, type SpaceMemberWithUser } from '../../api/spaces';
import UserCog from '../../assets/icons/user-cog.svg';
import { useTitle } from '../../hooks/useTitle';
import { useSelector } from '../../store';
import { breakpoint, flex, fontBold, mediaQuery, mL, p, pX, pY, textLg } from '../../styles/atoms';
import { blue, gray } from '../../styles/colors';
import { type Id } from '../../utils/id';
import Icon from '../atoms/Icon';
import JoinSpaceButton from '../molecules/JoinSpaceButton';
import LeaveSpaceButton from '../molecules/LeaveSpaceButton';
import ManageSpace from '../organisms/ManageSpace';
import ChatHeaderButton, { chatHeaderButtonStyle } from './ChatHeaderButton';
import { chatHeaderStyle, chatHeaderToolbar } from './styles';

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
        </Title>
        <Buttons>
          {myMember?.isAdmin && (
            <ChatHeaderButton onClick={startManage}>
              <Icon icon={UserCog} /> 管理
            </ChatHeaderButton>
          )}
          {space.isPublic && (
            <JoinSpaceButton css={[mL(1), chatHeaderButtonStyle]} data-small id={space.id} />
          )}
          <LeaveSpaceButton
            css={[mL(1), chatHeaderButtonStyle]}
            data-small
            id={space.id}
            name={space.name}
          />
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
