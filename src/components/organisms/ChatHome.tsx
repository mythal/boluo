import * as React from 'react';
import { useState } from 'react';
import { css } from '@emotion/core';
import styled from '@emotion/styled';
import { chatHeaderStyle, chatHeaderToolbar, fontBold, mL, p, pX, pY, textLg } from '../../styles/atoms';
import { Space, SpaceMember } from '../../api/spaces';
import { useDispatch, useSelector } from '../../store';
import Icon from '../../components/atoms/Icon';
import ChatHeaderButton, { chatHeaderButtonStyle } from '../../components/atoms/ChatHeaderButton';
import Badge from '../../components/atoms/Badge';
import userCog from '../../assets/icons/user-cog.svg';
import ManageSpace from '../../components/organisms/ManageSpace';
import { Channel } from '../../api/channels';
import JoinSpaceButton from '../../components/molecules/JoinSpaceButton';
import LeaveSpaceButton from '../../components/molecules/LeaveSpaceButton';
import { useTitle } from '../../hooks/useTitle';
import { usePane } from '../../hooks/usePane';
import { chatPath } from '../../utils/path';
import { useHistory } from 'react-router-dom';
import { blue, gray } from '../../styles/colors';

const Header = styled.div(chatHeaderStyle);

const container = css`
  grid-row: list-start / compose-end;
  ${[pX(4), pY(4)]};

  border: 1px solid ${gray['900']};

  &[data-active='true'] {
    border-color: ${blue['800']};
  }
`;

const Title = styled.div`
  grid-area: title;
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
  ${chatHeaderToolbar};
`;

function ChatHome({ space, members, channels }: Props) {
  useTitle(space.name);

  const pane = usePane();
  const dispatch = useDispatch();
  const history = useHistory();
  const activePane = useSelector((state) => pane === state.activePane);
  const setActive = () => {
    if (!activePane) {
      dispatch({ type: 'SWITCH_ACTIVE_PANE', pane });
      history.replace(chatPath(space.id));
    }
  };
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
      <div css={container} onClick={setActive} data-active={activePane}>
        <Description>{space.description}</Description>
      </div>
      {managing && myMember && (
        <ManageSpace space={space} channels={channels} members={members} my={myMember} dismiss={stopManage} />
      )}
    </React.Fragment>
  );
}

export default ChatHome;
