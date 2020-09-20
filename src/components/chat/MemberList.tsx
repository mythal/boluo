import * as React from 'react';
import styled from '@emotion/styled';
import { useSelector } from '../../store';
import { roundedSm, spacingN, uiShadow } from '../../styles/atoms';
import MemberListItem from './MemberListItem';
import { blue } from '../../styles/colors';
import { usePane } from '../../hooks/usePane';

const Container = styled.div`
  padding: ${spacingN(2)} 0;
  ${roundedSm};
  width: 10rem;
  background-color: ${blue['900']};
  ${uiShadow};
  max-height: 60vh;
  overflow-y: scroll;
`;

function MemberList() {
  const pane = usePane();
  const members = useSelector((state) => state.chatPane[pane]!.members);
  const heartbeatMap = useSelector((state) => state.chatPane[pane]!.heartbeatMap);

  return (
    <Container>
      {members.map((member) => (
        <MemberListItem key={member.user.id} timestamp={heartbeatMap.get(member.user.id)} member={member} />
      ))}
    </Container>
  );
}

export default React.memo(MemberList);
