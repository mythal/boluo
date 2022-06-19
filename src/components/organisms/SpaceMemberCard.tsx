import * as React from 'react';
import { useEffect } from 'react';
import { Space, SpaceMember } from '../../api/spaces';
import { AppResult } from '../../api/request';
import SpaceRoleTag from '../molecules/SpaceRoleTag';
import Badge from '../atoms/Badge';
import { css } from '@emotion/core';
import { mR, mT, pX, pY, roundedPx, textLg, uiShadow } from '../../styles/atoms';
import { darken } from 'polished';
import LeaveSpaceButton from '../molecules/LeaveSpaceButton';
import { RenderError } from '../molecules/RenderError';
import { useDispatch, useSelector } from '../../store';
import { errLoading } from '../../api/error';
import { User } from '../../api/users';
import { bgColor } from '../../styles/colors';
import { loadUser } from '../../actions';

interface Props {
  member: SpaceMember;
  space: Space;
  className?: string;
}

function MemberCardContent({ member, space }: Props) {
  const id = member.userId;
  const self = useSelector((state) => state.profile?.user.id === id);
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(loadUser(id));
  }, [id, dispatch]);
  const result: AppResult<User> = useSelector((state) => state.ui.userSet.get(id, errLoading()));
  if (!result.isOk) {
    return <RenderError error={result.value} />;
  }
  const user = result.value;
  if (!user) {
    return <p>没有找到用户。</p>;
  }
  return (
    <div>
      <div>
        <span css={[textLg, mR(2)]}>{user.nickname}</span>
        <SpaceRoleTag space={space} member={member} />
        {self && <Badge color="#555">我自己</Badge>}
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
