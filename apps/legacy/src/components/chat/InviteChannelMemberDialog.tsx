import * as React from 'react';
import { useState } from 'react';
import Select from 'react-select';
import { post } from '../../api/request';
import { type User } from '../../api/users';
import { useDispatch, useSelector } from '../../store';
import { selectTheme } from '../../styles/atoms';
import { throwErr } from '../../utils/errors';
import { type Id } from '../../utils/id';
import Dialog from '../molecules/Dialog';

export interface MemberOption {
  label: string;
  value: Id;
}

export function makeMemberOption(user: User): MemberOption {
  return { label: user.nickname, value: user.id };
}

interface Props {
  dismiss: () => void;
  channelId: Id;
  spaceId: Id;
}

function InviteChannelMemberDialog({ channelId, dismiss, spaceId }: Props) {
  const dispatch = useDispatch();
  const spaceMembers = useSelector((state) => {
    const spaceResult = state.ui.spaceSet.get(spaceId);
    if (spaceResult?.isOk) {
      return spaceResult.value.members;
    } else {
      return {};
    }
  });
  const [membersToInvite, setMembersToInvite] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(false);

  const inviteMember = async () => {
    setLoading(true);
    for (const member of membersToInvite) {
      const userId = member.value;
      const inviteResult = await post('/channels/add_member', { channelId, userId });
      if (inviteResult.isErr) {
        throwErr(dispatch)(inviteResult.value);
      }
    }
    dismiss();
  };
  const handleChange = (values: readonly MemberOption[]) => {
    setMembersToInvite([...values]);
  };
  const memberOptions: MemberOption[] = [];
  for (const member of Object.values(spaceMembers)) {
    if (!member) {
      continue;
    }
    memberOptions.push(makeMemberOption(member.user));
  }
  return (
    <Dialog
      noOverflow
      confirmText="添加"
      mask
      title="添加新成员"
      dismiss={dismiss}
      confirm={inviteMember}
      loading={loading}
    >
      <Select
        isMulti
        options={memberOptions}
        theme={selectTheme}
        value={membersToInvite}
        onChange={handleChange}
      />
    </Dialog>
  );
}

export default React.memo(InviteChannelMemberDialog);
