import * as React from 'react';
import binoculars from '../../assets/icons/binoculars.svg';
import teleport from '../../assets/icons/teleport.svg';
import Icon from '../../components/atoms/Icon';
import { encodeUuid, Id } from '../../utils/id';
import { ButtonLink } from '../atoms/Button';

interface Props {
  isMember: boolean;
  spaceId: Id;
  className?: string;
}

function GotoSpaceLink({ isMember, spaceId, className }: Props) {
  const chatPath = `/chat/${encodeUuid(spaceId)}`;
  if (isMember) {
    return (
      <ButtonLink data-small data-variant="primary" className={className} to={chatPath}>
        <Icon sprite={teleport} /> 进入位面
      </ButtonLink>
    );
  } else {
    return (
      <ButtonLink data-small className={className} to={chatPath}>
        <Icon sprite={binoculars} /> 作为旁观者进入
      </ButtonLink>
    );
  }
}

export default React.memo(GotoSpaceLink);
