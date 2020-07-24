import * as React from 'react';
import Title from '../atoms/Title';
import { ProfileState } from '../../reducers/profile';
import Avatar from '../molecules/Avatar';
import { floatRight } from '../../styles/atoms';
import { mediaUrl } from '../../api/request';

interface Props {
  profile: ProfileState;
}

function Profile({ profile }: Props) {
  const { avatarId } = profile.user;
  const avatarUri = avatarId ? mediaUrl(avatarId) : null;
  return (
    <>
      <Avatar source={avatarUri} css={[floatRight]} size="6rem" />
      <div>
        <Title css={[]}>{profile.user.nickname}</Title>
      </div>

      <p>{profile.user.bio}</p>
    </>
  );
}

export default Profile;
