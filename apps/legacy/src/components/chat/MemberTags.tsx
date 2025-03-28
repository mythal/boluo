import * as React from 'react';
import { ChannelMember } from '../../api/channels';
import { SpaceMember } from '../../api/spaces';
import { mR } from '../../styles/atoms';
import { Id } from '../../utils/id';
import { adminTag, masterTag } from './styles';

interface Props {
  spaceMember: SpaceMember;
  channelMember?: ChannelMember | null;
  spaceOwnerId?: Id | null;
}

function MemberTags({ spaceMember, channelMember, spaceOwnerId }: Props) {
  return (
    <React.Fragment>
      {spaceMember.isAdmin && (
        <span css={[adminTag, mR(1)]}>
          {spaceOwnerId === spaceMember.userId ? '创建者' : '管理'}
        </span>
      )}
      {channelMember?.isMaster && <span css={masterTag}>主持</span>}
    </React.Fragment>
  );
}

export default MemberTags;
