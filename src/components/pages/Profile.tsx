import * as React from 'react';
import Title from '../atoms/Title';
import Avatar from '../molecules/Avatar';
import { floatRight } from '../../styles/atoms';
import { get, mediaUrl } from '../../api/request';
import { useParams } from 'react-router-dom';
import { useFetchResult, useTitleWithFetchResult } from '../../hooks';
import { User } from '../../api/users';
import { RenderError } from '../molecules/RenderError';

interface Params {
  id?: string;
}

function Profile() {
  const { id } = useParams<Params>();
  const [result] = useFetchResult<User>(() => get('/users/query', { id }), [id]);
  useTitleWithFetchResult<User>(result, (user) => (user ? user.nickname : '找不到'));
  if (!result.isOk) {
    return <RenderError error={result.value} more404 />;
  }
  const user = result.value;

  const { avatarId } = user;
  const avatarUri = avatarId ? mediaUrl(avatarId) : null;
  return (
    <>
      <Avatar source={avatarUri} css={[floatRight]} size="8rem" />
      <div>
        <Title>{user.nickname}</Title>
      </div>

      <p>{user.bio}</p>
    </>
  );
}

export default Profile;
