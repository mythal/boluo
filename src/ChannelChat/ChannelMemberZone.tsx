import React, { useState } from 'react';
import { ChannelMember } from '../api/channels';
import { EditChannelMemberSettings } from './EditChannelMemberSettings';

interface Props {
  member: ChannelMember;
}

export const ChannelMemberZone: React.FC<Props> = ({ member }) => {
  const { characterName } = member;
  const [editName, setEditName] = useState(false);

  const name = characterName.length > 0 ? <span>{characterName}</span> : <span>[未设定角色名]</span>;
  const edit = editName ? (
    <EditChannelMemberSettings member={member} dismiss={() => setEditName(false)} />
  ) : (
    <button type="button" onClick={() => setEditName(true)}>
      修改
    </button>
  );
  return (
    <div>
      {name} {edit}
    </div>
  );
};
