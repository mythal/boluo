import { css } from '@emotion/react';
import styled from '@emotion/styled';
import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { type ChannelMember } from '../../api/channels';
import { type SpaceMember } from '../../api/spaces';
import { type User } from '../../api/users';
import { mR, mX, mY, pX, pY, roundedPx, roundedSm, textSm } from '../../styles/atoms';
import { blue, gray } from '../../styles/colors';
import { isOnline } from '../../utils/profile';
import Avatar from '../molecules/Avatar';
import MemberDialog from './MemberDialog';
import MemberTags from './MemberTags';

interface Props {
  user: User;
  channelMember?: ChannelMember;
  spaceMember: SpaceMember;
  timestamp?: number;
  imAdmin: boolean;
  spaceOwnerId?: string;
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

function MemberListItem({
  user,
  channelMember,
  spaceOwnerId,
  spaceMember,
  timestamp,
  imAdmin,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isShowCard, showCard] = useState(false);
  const dismiss = useCallback(() => {
    showCard(false);
  }, []);
  return (
    <React.Fragment>
      <Container
        ref={containerRef}
        data-online={isOnline(timestamp)}
        onClick={() => showCard(true)}
      >
        <Avatar css={roundedPx} size="2.5rem" id={user.avatarId} />
        <div css={[mX(2)]}>
          <div>
            <span css={mR(1)}>{channelMember?.characterName || user.nickname}</span>
            <MemberTags
              spaceMember={spaceMember}
              channelMember={channelMember}
              spaceOwnerId={spaceOwnerId}
            />
          </div>
          <div css={usernameStyle}>{user.username}</div>
        </div>
      </Container>
    </React.Fragment>
  );
}

export default MemberListItem;
