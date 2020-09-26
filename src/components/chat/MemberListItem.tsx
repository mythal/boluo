import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { ChannelMember } from '../../api/channels';
import styled from '@emotion/styled';
import { mX, mY, pX, roundedPx, roundedSm, textSm } from '../../styles/atoms';
import { isOnline } from '../../utils/profile';
import { gray } from '../../styles/colors';
import { User } from '../../api/users';
import { SpaceMember } from '../../api/spaces';
import Avatar from '../molecules/Avatar';
import { css } from '@emotion/core';
import MemberDialog from './MemberDialog';

interface Props {
  user: User;
  channelMember?: ChannelMember;
  spaceMember: SpaceMember;
  timestamp?: number;
  imAdmin: boolean;
}

const Container = styled.div`
  user-select: none;
  display: flex;
  align-items: center;
  height: 3rem;
  min-width: 10rem;
  position: relative;
  ${[pX(1), mY(1), mX(2), roundedSm]}
  &:hover {
    background-color: ${gray['700']};
  }
`;

const nameStyle = css`
  line-height: 1rem;
`;

const usernameStyle = css`
  color: ${gray['500']};
  ${[textSm]};
  line-height: 1rem;
`;

function MemberListItem({ user, channelMember, spaceMember, timestamp, imAdmin }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isShowCard, showCard] = useState(false);
  const dismiss = useCallback(() => {
    showCard(false);
  }, []);
  return (
    <React.Fragment>
      <Container ref={containerRef} data-online={isOnline(timestamp)} onClick={() => showCard(true)}>
        <Avatar css={roundedPx} size="2.5rem" id={user.avatarId} />
        <div css={[mX(2)]}>
          <div css={nameStyle}>{user.nickname}</div>
          <div css={usernameStyle}>{user.username}</div>
        </div>
      </Container>
      {isShowCard && <MemberDialog spaceMember={spaceMember} user={user} dismiss={dismiss} imAdmin={imAdmin} />}
    </React.Fragment>
  );
}

export default MemberListItem;
