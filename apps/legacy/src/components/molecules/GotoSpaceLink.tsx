import * as React from 'react';
import Binoculars from '../../assets/icons/binoculars.svg';
import Teleport from '../../assets/icons/teleport.svg';
import Icon from '../../components/atoms/Icon';
import { encodeUuid, type Id } from '../../utils/id';
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
        <Icon icon={Teleport} /> 进入位面
      </ButtonLink>
    );
  } else {
    return (
      <ButtonLink data-small className={className} to={chatPath}>
        <Icon icon={Binoculars} /> 作为旁观者进入
      </ButtonLink>
    );
  }
}

export default React.memo(GotoSpaceLink);
