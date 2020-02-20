import React from 'react';
import { Space } from '../api/spaces';
import { post } from '../api/request';
import { useDispatch } from '../App/App';
import { JOINED_SPACE, JoinedSpace, LEFT_SPACE, LeftSpace } from '../App/actions';
import { errorText } from '../api/error';

interface Props {
  space: Space;
  joined: boolean;
}

export const SpaceMembershipButton: React.FC<Props> = ({ joined, space }) => {
  const dispatch = useDispatch();
  const { id, name } = space;
  const handle = async () => {
    if (!joined) {
      const result = await post('/spaces/join', {}, { id });
      if (result.isOk) {
        dispatch<JoinedSpace>({ tag: JOINED_SPACE, ...result.value });
      }
    } else if (window.confirm(`你确认要离开「${name}」位面吗？`)) {
      const result = await post('/spaces/leave', {}, { id });
      if (result.isOk) {
        dispatch<LeftSpace>({ tag: LEFT_SPACE, id });
      } else {
        alert(errorText(result.value));
      }
    }
  };
  return (
    <button className="btn p-1" type="button" onClick={handle}>
      {joined ? '离开位面' : '加入位面'}
    </button>
  );
};
