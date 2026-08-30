import * as React from 'react';
import { useState } from 'react';
import { post } from '../../api/request';
import Rocket from '@boluo/icons/legacy/Rocket';
import { useIsLoggedIn } from '../../hooks/useIsLoggedIn';
import { useDispatch, useSelector } from '../../store';
import { type Id } from '../../utils/id';
import Button, { type ButtonProps } from '../atoms/Button';
import Icon from '../atoms/Icon';

interface Props extends Omit<ButtonProps, 'children' | 'disabled' | 'onClick' | 'variant'> {
  id: Id;
  token?: string;
}

function JoinSpaceButton({ id, token, ...props }: Props) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const isLoggedIn = useIsLoggedIn();
  const isMember = useSelector((state) => state.profile?.spaces.has(id));

  if (!isLoggedIn || isMember) {
    return null;
  }

  const join = async () => {
    setLoading(true);
    const result = await post('/spaces/join', {}, { spaceId: id, token });
    setLoading(false);
    if (result.isOk) {
      const { space, member } = result.value;
      dispatch({ type: 'JOINED_SPACE', member, space });
    }
  };

  return (
    <Button {...props} variant="primary" disabled={loading} onClick={join}>
      <Icon icon={Rocket} loading={loading} /> 加入位面
    </Button>
  );
}

export default JoinSpaceButton;
