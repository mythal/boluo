import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { ChannelMember } from '../../api/channels';
import styled from '@emotion/styled';
import { mR, mX, mY, pX, pY, roundedPx, roundedSm, textSm } from '../../styles/atoms';
import { isOnline } from '../../utils/profile';
import { blue, gray } from '../../styles/colors';
import { User } from '../../api/users';
import { SpaceMember } from '../../api/spaces';
import Avatar from '../molecules/Avatar';
import { css } from '@emotion/core';
import MemberDialog from './MemberDialog';
import { adminTag, masterTag } from './styles';

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
  min-width: 14rem;
  position: relative;
  ${[pX(2), pY(2), mY(1), mX(1), roundedSm]}
  &:hover {
    background-color: ${gray['800']};
  }

  &[data-online='true'] {
    background-color: ${blue['800']};

    &:hover {
      background-color: ${blue['700']};
    }
  }
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
          <div>
            <span css={mR(1)}>{channelMember?.characterName || user.nickname}</span>
            {spaceMember.isAdmin && <span css={[adminTag, mR(1)]}>管理</span>}
            {channelMember?.isMaster && <span css={masterTag}>主持</span>}
          </div>
          <div css={usernameStyle}>{user.username}</div>
        </div>
      </Container>
      {isShowCard && <MemberDialog spaceMember={spaceMember} user={user} dismiss={dismiss} imAdmin={imAdmin} />}
    </React.Fragment>
  );
}

export default MemberListItem;
