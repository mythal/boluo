import * as React from 'react';
import { useState } from 'react';
import { Id } from '../../utils/id';
import { post } from '../../api/request';
import doorOpen from '../../assets/icons/door-open.svg';
import Icon from '../atoms/Icon';
import { useDispatch, useSelector } from '../../store';
import Text from '../atoms/Text';
import Dialog from '../../components/molecules/Dialog';

interface Props {
  id: Id;
  name: string;
  className?: string;
  'data-small'?: boolean;
}

function LeaveSpaceButton({ id, name, ...props }: Props) {
  const userId = useSelector((state) => state.profile?.spaces.get(id)?.member.userId);
  const dispatch = useDispatch();
  const [leaving, setLeaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  if (!userId) {
    return null;
  }
  const leave = async () => {
    setConfirmDialog(false);
    setLeaving(true);
    const result = await post('/spaces/leave', {}, { id });
    setLeaving(false);
    if (result.isOk) {
      dispatch({ type: 'LEFT_SPACE', spaceId: id, userId });
    }
  };

  return (
    <>
      <button data-variant="danger" onClick={() => setConfirmDialog(true)} disabled={leaving} {...props}>
        <Icon sprite={doorOpen} loading={leaving} />
        退出
      </button>
      {confirmDialog && (
        <Dialog confirm={leave} dismiss={() => setConfirmDialog(false)} mask title="退出位面">
          <Text>确认要退出「{name}」位面吗？</Text>
        </Dialog>
      )}
    </>
  );
}

export default LeaveSpaceButton;
