import * as React from 'react';
import Button from '../atoms/Button';
import Icon from '../atoms/Icon';
import rocket from '../../assets/icons/rocket.svg';
import { Id } from '../../utils/id';
import { useState } from 'react';
import { post } from '../../api/request';
import { useDispatch } from '../Provider';

interface Props {
  id: Id;
  className?: string;
}

function JoinSpaceButton({ className, id }: Props) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
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
    <Button onClick={join} className={className} data-variant="primary" disabled={loading}>
      <Icon sprite={rocket} loading={loading} /> 加入位面
    </Button>
  );
}

export default JoinSpaceButton;
