import * as React from 'react';
import { Id } from '../../utils/id';
import Button from '../atoms/Button';
import { post } from '../../api/request';
import { useDispatch } from '../Provider';

interface Props {
  id: Id;
  name: string;
  className?: string;
  'data-small'?: boolean;
}

function LeaveSpaceButton({ id, name, ...props }: Props) {
  const dispatch = useDispatch();
  const leave = async () => {
    const result = await post('/spaces/leave', {}, { id });
    if (result.isOk && confirm(`确认要退出「${name}」位面吗？`)) {
      dispatch({ type: 'LEFT_SPACE', id });
    }
  };

  return (
    <Button data-variant="danger" onClick={leave} {...props}>
      退出位面
    </Button>
  );
}

export default LeaveSpaceButton;
