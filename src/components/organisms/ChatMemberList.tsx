import * as React from 'react';
import styled from '@emotion/styled';
import { useSelector } from '../../store';
import { fontBold, pX, pY } from '../../styles/atoms';
import { darken } from 'polished';
import MemberListItem from '../../components/molecules/MemberListItem';
import { bgColor } from '../../styles/colors';
import { usePane } from '../../hooks/usePane';

const Container = styled.div`
  width: 10rem;
  grid-area: members;
  background-color: ${darken(0.05, bgColor)};
  border-left: 1px solid #000;
`;

const Title = styled.div`
  ${[fontBold, pX(4), pY(2)]};
`;

function ChatMemberList() {
  const pane = usePane();
  const open = useSelector((state) => state.chatPane[pane]!.memberList);
  const members = useSelector((state) => state.chatPane[pane]!.members) || [];
  const heartbeatMap = useSelector((state) => state.chatPane[pane]!.heartbeatMap);

  if (!open) {
    return null;
  }
  return (
    <Container>
      <Title>成员列表</Title>
      {members.map((member) => (
        <MemberListItem key={member.user.id} timestamp={heartbeatMap.get(member.user.id)} member={member} />
      ))}
    </Container>
  );
}

export default ChatMemberList;
