import { css } from '@emotion/react';
import { darken } from 'polished';
import * as React from 'react';
import { useEffect } from 'react';
import { loadUser } from '../../actions';
import { errLoading } from '../../api/error';
import { type AppResult } from '../../api/request';
import { type Space, type SpaceMember } from '../../api/spaces';
import { type User } from '../../api/users';
import { useDispatch, useSelector } from '../../store';
import { mR, mT, pX, pY, roundedPx, textLg, uiShadow } from '../../styles/atoms';
import { bgColor } from '../../styles/colors';
import Badge from '../atoms/Badge';
import LeaveSpaceButton from '../molecules/LeaveSpaceButton';
import { RenderError } from '../molecules/RenderError';
import SpaceRoleTag from '../molecules/SpaceRoleTag';

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
