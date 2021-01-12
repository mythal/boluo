import * as React from 'react';
import { useState } from 'react';
import { selectTheme } from '../../styles/atoms';
import Dialog from '../molecules/Dialog';
import { ValueType } from 'react-select';
import { User } from '../../api/users';
import { Id } from '../../utils/id';
import { post } from '../../api/request';
import { useDispatch } from '../../store';
import { throwErr } from '../../utils/errors';

const Select = React.lazy(() => import('react-select'));

export interface MemberOption {
  label: string;
  value: Id;
}

export function makeMemberOption(user: User): MemberOption {
  return { label: user.nickname, value: user.id };
}

interface Props {
  members: User[];
  dismiss: () => void;
  channelId: Id;
}

function InviteChannelMemberDialog({ channelId, members, dismiss }: Props) {
  const dispatch = useDispatch();
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
  const handleChange = (value: ValueType<MemberOption, false>) => {
    const values = (value || []) as MemberOption[];
    setMembersToInvite(values);
  };
  const memberOptions = members.map(makeMemberOption);
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
      <Select isMulti options={memberOptions} theme={selectTheme} value={membersToInvite} onChange={handleChange} />
    </Dialog>
  );
}

export default React.memo(InviteChannelMemberDialog);
