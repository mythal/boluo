import React, { useState } from 'react';
import { ChannelMember } from '../api/channels';
import { EditChannelMemberSettings } from './EditChannelMemberSettings';

interface Props {
  member: ChannelMember;
}

export const ChannelMemberZone: React.FC<Props> = ({ member }) => {
  const { characterName } = member;
  const [editName, setEditName] = useState(false);

  const name =
    characterName.length > 0 ? <span>{characterName}</span> : <span className="text-gray-600">[未设定角色名]</span>;
  const edit = editName ? <EditChannelMemberSettings member={member} dismiss={() => setEditName(false)} /> : null;
  return (
    <div>
      {name}
      <button className="btn p-1 mx-1" type="button" onClick={() => setEditName(!editName)}>
        {editName ? '取消' : '修改'}
      </button>
      {edit}
    </div>
  );
};
