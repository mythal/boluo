import * as React from 'react';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { loadUser } from '../../actions';
import { errLoading, notFound } from '../../api/error';
import { type AppResult } from '../../api/request';
import { type User } from '../../api/users';
import { useTitleWithResult } from '../../hooks/useTitle';
import { useDispatch, useSelector } from '../../store';
import { floatRight, roundedSm } from '../../styles/atoms';
import { decodeUuid } from '../../utils/id';
import Title from '../atoms/Title';
import Avatar from '../molecules/Avatar';
import { RenderError } from '../molecules/RenderError';

function Profile() {
  let { id } = useParams();
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
