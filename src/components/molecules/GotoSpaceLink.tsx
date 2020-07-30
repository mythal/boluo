import * as React from 'react';
import { encodeUuid, Id } from '@/utils/id';
import { Link } from 'react-router-dom';
import Icon from '@/components/atoms/Icon';
import teleport from '@/assets/icons/teleport.svg';
import binoculars from '@/assets/icons/binoculars.svg';
import { lightButton } from '@/styles/atoms';

interface Props {
  isMember: boolean;
  spaceId: Id;
}

function GotoSpaceLink({ isMember, spaceId }: Props) {
  const chatPath = `/chat/${encodeUuid(spaceId)}`;
  if (isMember) {
    return (
      <Link css={lightButton} to={chatPath}>
        <Icon sprite={teleport} /> 进入位面
      </Link>
    );
  } else {
    return (
      <Link css={lightButton} to={chatPath}>
        <Icon sprite={binoculars} /> 作为旁观者进入
      </Link>
    );
  }
}

export default React.memo(GotoSpaceLink);
