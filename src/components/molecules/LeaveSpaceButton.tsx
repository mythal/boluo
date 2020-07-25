import * as React from 'react';
import { Id } from '../../utils/id';
import Button from '../atoms/Button';
import { post } from '../../api/request';
import { useDispatch } from '../Provider';
import doorOpen from '../../assets/icons/door-open.svg';
import Icon from '../atoms/Icon';
import { useState } from 'react';

interface Props {
  id: Id;
  name: string;
  className?: string;
  'data-small'?: boolean;
}

function LeaveSpaceButton({ id, name, ...props }: Props) {
  const dispatch = useDispatch();
  const [leaving, setLeaving] = useState(false);
  const leave = async () => {
    if (confirm(`确认要退出「${name}」位面吗？`)) {
      setLeaving(true);
      const result = await post('/spaces/leave', {}, { id });
      if (result.isOk) {
        dispatch({ type: 'LEFT_SPACE', id });
      }
      setLeaving(false);
    }
  };

  return (
    <Button data-variant="danger" onClick={leave} disabled={leaving} {...props}>
      <Icon sprite={doorOpen} spin={leaving} />
      退出位面
    </Button>
  );
}

export default LeaveSpaceButton;
