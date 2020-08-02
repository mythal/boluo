import * as React from 'react';
import { encodeUuid, Id } from '@/utils/id';
import Icon from '@/components/atoms/Icon';
import teleport from '@/assets/icons/teleport.svg';
import binoculars from '@/assets/icons/binoculars.svg';
import { OutlineButtonLink } from '@/components/atoms/OutlineButton';

interface Props {
  isMember: boolean;
  spaceId: Id;
  className?: string;
}

function GotoSpaceLink({ isMember, spaceId, className }: Props) {
  const chatPath = `/chat/${encodeUuid(spaceId)}`;
  if (isMember) {
    return (
      <OutlineButtonLink css={[]} className={className} to={chatPath}>
        <Icon sprite={teleport} /> 进入位面
      </OutlineButtonLink>
    );
  } else {
    return (
      <OutlineButtonLink className={className} to={chatPath}>
        <Icon sprite={binoculars} /> 作为旁观者进入
      </OutlineButtonLink>
    );
  }
}

export default React.memo(GotoSpaceLink);
