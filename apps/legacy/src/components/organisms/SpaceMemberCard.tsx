import * as React from 'react';
import { useEffect } from 'react';
import { loadUser } from '../../actions';
import { errLoading } from '../../api/error';
import { type AppResult } from '../../api/request';
import { type Space, type SpaceMember } from '../../api/spaces';
import { type User } from '../../api/users';
import { useDispatch, useSelector } from '../../store';
import { cls } from '../../utils/classnames';
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
        <span className="mr-2 text-[1.125rem]">{user.nickname}</span>
        <SpaceRoleTag space={space} member={member} />
        {self && <Badge color="#555">我自己</Badge>}
      </div>
      {self && (
        <div className="mt-4">
          <LeaveSpaceButton id={space.id} name={space.name} size="small" />
        </div>
      )}
    </div>
  );
}

function SpaceMemberCard({ className, ...props }: Props) {
  return (
    <div
      className={cls(
        'bg-legacy-member-card-background shadow-legacy-ui rounded-[1px] px-3 py-3',
        className,
      )}
    >
      <MemberCardContent {...props} />
    </div>
  );
}

export default SpaceMemberCard;
