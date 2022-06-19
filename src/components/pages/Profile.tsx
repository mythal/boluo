import * as React from 'react';
import { useEffect } from 'react';
import Title from '../atoms/Title';
import Avatar from '../molecules/Avatar';
import { floatRight, roundedSm } from '../../styles/atoms';
import { AppResult } from '../../api/request';
import { useParams } from 'react-router-dom';
import { User } from '../../api/users';
import { RenderError } from '../molecules/RenderError';
import { decodeUuid } from '../../utils/id';
import { useDispatch, useSelector } from '../../store';
import { errLoading, notFound } from '../../api/error';
import { useTitleWithResult } from '../../hooks/useTitle';
import { loadUser } from '../../actions';

interface Params {
  id?: string;
}

function Profile() {
  let { id } = useParams<Params>();
  id = id ? decodeUuid(id) : undefined;
  const myId = useSelector((state) => state.profile?.user.id);
  id = id ?? myId;
  const dispatch = useDispatch();
  useEffect(() => {
    if (!id) {
      return;
    }
    dispatch(loadUser(id));
  }, [id, dispatch]);
  const result: AppResult<User> = useSelector((state) => {
    if (!id) {
      return notFound('没有找到要查询的用户的ID。');
    }
    return state.ui.userSet.get(id, errLoading<User>());
  });
  useTitleWithResult<User>(result, (user) => user.nickname);
  if (!result.isOk) {
    return <RenderError error={result.value} more404 />;
  }
  const user = result.value;

  const { avatarId } = user;
  return (
    <>
      <Avatar id={avatarId} css={[floatRight, roundedSm]} size="8rem" />
      <div>
        <Title>{user.nickname}</Title>
      </div>

      <p>{user.bio}</p>
    </>
  );
}

export default Profile;
