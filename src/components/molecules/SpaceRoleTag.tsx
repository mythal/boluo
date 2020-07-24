import * as React from 'react';
import { Space, SpaceMember } from '../../api/spaces';
import Tag from '../atoms/Tag';

interface Props {
  space: Space;
  member?: SpaceMember;
  className?: string;
}

function SpaceRoleTag({ space, member, className }: Props) {
  if (!member) {
    return (
      <Tag className={className} color="#4A5568">
        未加入
      </Tag>
    );
  } else if (space.ownerId === member.userId) {
    return (
      <Tag className={className} color="#6B46C1">
        创建者
      </Tag>
    );
  } else if (member.isAdmin) {
    return (
      <Tag className={className} color="#2B6CB0">
        管理员
      </Tag>
    );
  } else {
    return (
      <Tag className={className} color="#2F855A">
        成员
      </Tag>
    );
  }
}

export default SpaceRoleTag;
