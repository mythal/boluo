import * as React from 'react';
import { type ChannelMember } from '../../api/channels';
import { type SpaceMember } from '../../api/spaces';
import { type Id } from '../../utils/id';
import { cls } from '../../utils/classnames';

interface Props {
  spaceMember: SpaceMember;
  channelMember?: ChannelMember | null;
  spaceOwnerId?: Id | null;
}

const tagClassName =
  'inline-block select-none rounded-[3px] px-1 py-0.5 text-[0.75rem] shadow-[0_0_1px_rgba(0,0,0,0.5)]';

function MemberTags({ spaceMember, channelMember, spaceOwnerId }: Props) {
  return (
    <React.Fragment>
      {spaceMember.isAdmin && (
        <span className={cls(tagClassName, 'bg-legacy-primary-700 mr-1')}>
          {spaceOwnerId === spaceMember.userId ? '创建者' : '管理'}
        </span>
      )}
      {channelMember?.isMaster && (
        <span className={cls(tagClassName, 'bg-legacy-purple-800')}>主持</span>
      )}
    </React.Fragment>
  );
}

export default MemberTags;
