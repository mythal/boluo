import * as React from 'react';
import { Space, SpaceMember } from '../../api/spaces';
import { useProfile } from '../Provider';
import { useFetchResult } from '../../hooks';
import { get } from '../../api/request';
import SpaceRoleTag from '../molecules/SpaceRoleTag';
import Tag from '../atoms/Tag';
import { css } from '@emotion/core';
import { bgColor, mR, mT, pX, pY, roundedPx, textLg, uiShadow } from '../../styles/atoms';
import { darken } from 'polished';
import LeaveSpaceButton from '../molecules/LeaveSpaceButton';

interface Props {
  member: SpaceMember;
  space: Space;
  className?: string;
}

function MemberCardContent({ member, space }: Props) {
  const profile = useProfile();
  const id = member.userId;
  const [result] = useFetchResult(() => get('/users/query', { id }), [id]);
  if (!result.isOk) {
    return result.value;
  }
  const self = profile?.user.id === id;
  const user = result.value;
  if (!user) {
    return <p>没有找到用户。</p>;
  }
  return (
    <div>
      <div>
        <span css={[textLg, mR(2)]}>{user.nickname}</span>
        <SpaceRoleTag space={space} member={member} />
        {self && <Tag color="#555">我自己</Tag>}
      </div>
      {self && (
        <div css={[mT(4)]}>
          <LeaveSpaceButton id={space.id} name={space.name} data-small />
        </div>
      )}
    </div>
  );
}

const cardStyle = css`
  ${[pX(3), pY(3), roundedPx, uiShadow]};
  background-color: ${darken(0.1, bgColor)};
`;

function SpaceMemberCard({ className, ...props }: Props) {
  return (
    <div css={cardStyle} className={className}>
      <MemberCardContent {...props} />
    </div>
  );
}

export default SpaceMemberCard;
