import * as React from 'react';
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';
import rocket from '@/assets/icons/rocket.svg';
import { Id } from '@/utils/id';
import { useState } from 'react';
import { post } from '@/api/request';
import { useDispatch, useSelector } from '@/store';
import { useIsLoggedIn } from '@/hooks';

interface Props {
  id: Id;
  className?: string;
  'data-small'?: boolean;
}

function JoinSpaceButton({ id, ...props }: Props) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const isLoggedIn = useIsLoggedIn();
  const isMember = useSelector((state) => state.profile?.spaces.has(id));

  if (!isLoggedIn || isMember) {
    return null;
  }

  const join = async () => {
    setLoading(true);
    const result = await post('/spaces/join', {}, { id });
    setLoading(false);
    if (result.isOk) {
      const { space, member } = result.value;
      dispatch({ type: 'JOINED_SPACE', member, space });
    }
  };

  return (
    <Button onClick={join} {...props} data-variant="primary" disabled={loading}>
      <Icon sprite={rocket} loading={loading} /> 加入位面
    </Button>
  );
}

export default JoinSpaceButton;
