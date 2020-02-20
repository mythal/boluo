import React, { useState } from 'react';
import { InputField } from '../From/InputField';
import { post } from '../api/request';
import { useDispatch } from '../App/App';
import { CHANNEL_MEMBER_EDITED, ChannelMemberEdited } from '../App/actions';
import { ChannelMember, EditChannelMember } from '../api/channels';
import { errorText } from '../api/error';

interface Props {
  member: ChannelMember;
  dismiss: () => void;
}

export const EditChannelMemberSettings: React.FC<Props> = ({ member, dismiss }) => {
  const [characterName, setCharacterName] = useState(member.characterName);
  const [textColor, setTextColor] = useState(member.textColor ? member.textColor : '#000000');
  const { channelId } = member;
  const dispatch = useDispatch();
  const handleSubmit: React.FormEventHandler = async e => {
    e.preventDefault();
    const editMember: EditChannelMember = { channelId };
    if (characterName !== member.characterName) {
      editMember.characterName = characterName;
    }
    if (textColor !== undefined) {
      editMember.textColor = textColor;
    }
    const edited = await post('/channels/edit_member', editMember);
    if (edited.isErr) {
      alert(errorText(edited.value));
    } else if (edited.value !== null) {
      const member = edited.value;
      dispatch<ChannelMemberEdited>({ tag: CHANNEL_MEMBER_EDITED, channelId, member });
      dismiss();
    }
  };
  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="border absolute p-2 w-64 bg-white top-0 right-0">
        <InputField value={characterName} onChange={setCharacterName} label="角色名" />
        <div className="text-right">
          <div>
            <label className="text-xs" htmlFor="text-color">
              文字色彩
            </label>
            <input
              className="w-8 h-8"
              id="text-color"
              value={textColor}
              onChange={e => setTextColor(e.target.value)}
              type="color"
            />
          </div>
          <button className="btn p-1" type="submit">
            修改
          </button>
        </div>
      </form>
    </div>
  );
};
