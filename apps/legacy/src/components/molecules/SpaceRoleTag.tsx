import * as React from 'react';
import { type Space, type SpaceMember } from '../../api/spaces';
import Badge from '../atoms/Badge';

interface Props {
  space: Space;
  member?: SpaceMember;
  className?: string;
}

function SpaceRoleTag({ space, member, className }: Props) {
  if (!member) {
    return (
      <Badge className={className} color="#4A5568">
        未加入
      </Badge>
    );
  } else if (space.ownerId === member.userId) {
    return (
      <Badge className={className} color="#6B46C1">
        创建者
      </Badge>
    );
  } else if (member.isAdmin) {
    return (
      <Badge className={className} color="#2B6CB0">
        管理员
      </Badge>
    );
  } else {
    return (
      <Badge className={className} color="#2F855A">
        成员
      </Badge>
    );
  }
}

export default SpaceRoleTag;
