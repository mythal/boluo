import * as React from 'react';
import { useState } from 'react';
import { post } from '../../api/request';
import Rocket from '../../assets/icons/rocket.svg';
import { useIsLoggedIn } from '../../hooks/useIsLoggedIn';
import { useDispatch, useSelector } from '../../store';
import { type Id } from '../../utils/id';
import Icon from '../atoms/Icon';

interface Props {
  id: Id;
  className?: string;
  'data-small'?: boolean;
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
    <button onClick={join} {...props} data-variant="primary" disabled={loading}>
      <Icon icon={Rocket} loading={loading} /> 加入位面
    </button>
  );
}

export default JoinSpaceButton;
