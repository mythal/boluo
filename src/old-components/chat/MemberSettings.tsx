import React, { useState } from 'react';
import { Input } from '../Input';
import { KeyTooltip } from './KeyTooltip';
import { UserEditIcon } from '../icons';
import { ColorPicker } from './ColorPicker';
import { useDispatch } from '../Provider';
import { post } from '../../api/request';
import { throwErr } from '../../errors';
import { ChannelMember, EditChannelMember } from '../../api/channels';
import { ConfirmDialog } from '../ConfirmDialog';
import { ChannelMemberEdited } from '../../actions/profile';

interface Props {
  member: ChannelMember;
}

export const MemberSettings = React.memo<Props>(({ member }) => {
  const dispatch = useDispatch();
  const { channelId } = member;
  const [open, setOpen] = useState(false);
  const [characterName, setName] = useState(member.characterName);
  const [textColor, setTextColor] = useState(member.textColor || '#000000');
  const dismiss = () => setOpen(false);
  const handleSubmit = async () => {
    const editMember: EditChannelMember = { channelId };
    if (characterName !== member.characterName) {
      editMember.characterName = characterName;
    }
    if (textColor && textColor !== member.textColor) {
      editMember.textColor = textColor;
    }
    const edited = await post('/channels/edit_member', editMember);
    if (edited.isErr) {
      throwErr(dispatch)(edited.value);
    } else if (edited.value !== null) {
      const member = edited.value;
      dispatch<ChannelMemberEdited>({ type: 'CHANNEL_MEMBER_EDITED', channelId, member });
      dismiss();
    }
  };
  return (
    <>
      <KeyTooltip help="编辑发言信息" keyHelp="">
        <button className="btn-sized" onClick={() => setOpen(true)}>
          <UserEditIcon />
        </button>
      </KeyTooltip>
      <ConfirmDialog dismiss={dismiss} submit={handleSubmit} open={open} confirmText="修改">
        <Input value={characterName} onChange={setName} label="角色名" />
        <ColorPicker value={textColor} onChange={setTextColor} />
      </ConfirmDialog>
    </>
  );
});
