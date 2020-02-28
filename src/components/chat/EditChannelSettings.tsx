import React, { useState } from 'react';
import { Dialog } from '../Dialog';
import { Input } from '../Input';
import { KeyTooltip } from './KeyTooltip';
import { UserEditIcon } from '../icons';
import { ColorPicker } from '../ColorPicker';
import { ChannelMemberEdited } from '../../states/actions';
import { useDispatch } from '../App';
import { post } from '../../api/request';
import { throwErr } from '../../helper';
import { ChannelMember, EditChannelMember } from '../../api/channels';

interface Props {
  member: ChannelMember;
}

export const EditChannelSettings = React.memo<Props>(({ member }) => {
  const dispatch = useDispatch();
  const { channelId } = member;
  const [open, setOpen] = useState(false);
  const [characterName, setName] = useState(member.characterName);
  const [textColor, setTextColor] = useState(member.textColor || '#000000');
  const dismiss = () => setOpen(false);
  const handleSubmit: React.FormEventHandler = async e => {
    e.preventDefault();
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
        <button className="btn" onClick={() => setOpen(true)}>
          <UserEditIcon />
        </button>
      </KeyTooltip>
      <Dialog open={open} dismiss={dismiss}>
        <form className="dialog" onSubmit={handleSubmit}>
          <Input value={characterName} onChange={setName} label="角色名" />
          <ColorPicker value={textColor} onChange={setTextColor} />
          <div className="mt-4 text-right">
            <button type="button" className="btn mr-1" onClick={dismiss}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              修改
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
});
