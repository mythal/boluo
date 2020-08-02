import * as React from 'react';
import { Member } from '@/api/channels';
import styled from '@emotion/styled';
import { pL, primaryColor, pX, pY, spacingN, textSm } from '@/styles/atoms';
import { isOnline } from '@/utils/profile';

interface Props {
  member: Member;
  timestamp: number | undefined;
}

const Container = styled.div`
  ${[pX(4), pY(1), textSm]};

  &[data-online='true'] {
    ${pL(3)};
    border-left: ${spacingN(1)} solid ${primaryColor};
  }

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

function MemberListItem({ member, timestamp }: Props) {
  return <Container data-online={isOnline(timestamp)}>{member.user.nickname}</Container>;
}

export default React.memo(MemberListItem);
