import * as React from 'react';
import styled from '@emotion/styled';
import { useSelector } from '../../store';
import { roundedSm, uiShadow } from '../../styles/atoms';
import MemberListItem from './MemberListItem';
import { blue } from '../../styles/colors';
import { usePane } from '../../hooks/usePane';

const Container = styled.div`
  ${roundedSm};
  background-color: ${blue['900']};
  ${uiShadow};
  max-height: 60vh;
  overflow-y: auto;
`;

function MemberList() {
  const pane = usePane();
  const myId = useSelector((state) => state.profile?.user.id);
  const members = useSelector((state) => state.chatPane[pane]!.members);
  const heartbeatMap = useSelector((state) => state.chatPane[pane]!.heartbeatMap);
  const spaceOwnerId = useSelector((state) => {
    const spaceResult = state.ui.spaceSet.get(state.chatPane[pane]!.channel.spaceId);
    if (spaceResult === undefined || spaceResult.isErr) {
      return undefined;
    } else {
      return spaceResult.value.space.ownerId;
    }
  });
  const myMember = myId ? members.find((member) => member.user.id === myId) : undefined;
  const imAdmin = Boolean(myMember && myMember.space.isAdmin);

  return (
    <Container>
      {members.map(({ user, space, channel }) => (
        <MemberListItem
          key={user.id}
          timestamp={heartbeatMap.get(user.id)}
          user={user}
          spaceMember={space}
          channelMember={channel}
          imAdmin={imAdmin}
          spaceOwnerId={spaceOwnerId}
        />
      ))}
    </Container>
  );
}

export default React.memo(MemberList);
