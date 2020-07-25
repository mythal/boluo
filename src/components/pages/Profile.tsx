import * as React from 'react';
import Title from '../atoms/Title';
import { ProfileState } from '../../reducers/profile';
import Avatar from '../molecules/Avatar';
import { floatRight } from '../../styles/atoms';
import { AppResult, get, mediaUrl } from '../../api/request';
import { useParams } from 'react-router-dom';
import { useFetch, useTitleWithFetchResult } from '../../hooks';
import { User } from '../../api/users';
import NotFound from './NotFound';
import Loading from '../molecules/Loading';
import InformationBar from '../molecules/InformationBar';
import { errorText } from '../../api/error';

interface Params {
  id?: string;
}

interface Props {
  profile?: ProfileState;
}

function Profile({ profile }: Props) {
  const { id } = useParams<Params>();
  const [result] = useFetch<AppResult<User | null>>(() => get('/users/query', { id }), [id]);
  useTitleWithFetchResult<User | null>(result, (user) => (user ? user.nickname : '找不到'));
  if (!id && !profile) {
    return <NotFound />;
  }
  let user: User;
  if (profile && !id) {
    user = profile.user;
  } else {
    if (result === 'LOADING') {
      return <Loading />;
    }
    if (!result.isOk) {
      return <InformationBar variant="ERROR">{errorText(result.value)}</InformationBar>;
    }
    if (!result.value) {
      return <NotFound />;
    }
    user = result.value;
  }

  const { avatarId } = user;
  const avatarUri = avatarId ? mediaUrl(avatarId) : null;
  return (
    <>
      <Avatar source={avatarUri} css={[floatRight]} size="6rem" />
      <div>
        <Title css={[]}>{user.nickname}</Title>
      </div>

      <p>{user.bio}</p>
    </>
  );
}

export default Profile;
