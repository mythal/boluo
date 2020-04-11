import React from 'react';
import { User } from '../../api/users';
import { ChannelMember } from '../../api/channels';

interface Props {
  profile: User;
  member: ChannelMember;
}

export const Character = React.memo<Props>(() => {
  return <div></div>;
});
