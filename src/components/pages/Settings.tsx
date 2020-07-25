import * as React from 'react';
import { useForm } from 'react-hook-form';
import { EditUser } from '../../api/users';
import { alignRight, flex, largeInput, mR, mT, mY, spacingN, textLg } from '../../styles/atoms';
import { Label } from '../atoms/Label';
import Input from '../atoms/Input';
import { bioValidation, nicknameValidation } from '../../validators';
import { ErrorMessage } from '../atoms/ErrorMessage';
import Button from '../atoms/Button';
import { ProfileState } from '../../reducers/profile';
import { useState } from 'react';
import { AppError, errorText } from '../../api/error';
import InformationBar from '../molecules/InformationBar';
import { editAvatar, get, post } from '../../api/request';
import { useDispatch } from '../Provider';
import logout from '../../assets/icons/logout.svg';
import save from '../../assets/icons/save.svg';
import Icon from '../atoms/Icon';
import { useHistory } from 'react-router-dom';
import { clearCsrfToken } from '../../api/csrf';
import { LoggedOut } from '../../actions/profile';
import TextArea from '../atoms/TextArea';
import EditAvatar from '../organisms/EditAvatar';
import Separator from '../atoms/Separator';
import { css } from '@emotion/core';

interface Props {
  profile: ProfileState;
}

const nicknameFieldStyle = css`
  flex-grow: 1;
  margin-right: ${spacingN(2)};
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
`;

function Settings({ profile }: Props) {
  const dispatch = useDispatch();
  const history = useHistory();
  const { register, handleSubmit, errors } = useForm<EditUser>();
  const [updated, setUpdated] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [appError, setAppError] = useState<AppError | null>(null);
  const onSubmit = async (data: EditUser) => {
    if (data.bio !== profile.user.bio || data.nickname !== profile.user.nickname) {
      const result = await post('/users/edit', data);
      if (!result.isOk) {
        setAppError(result.value);
      } else {
        const user = result.value;
        dispatch({ type: 'USER_EDITED', user });
        setUpdated(true);
      }
    }
    if (avatarFile) {
      const result = await editAvatar(avatarFile, avatarFile.name, avatarFile.type);
      if (result.isOk) {
        const user = result.value;
        dispatch({ type: 'USER_EDITED', user });
        setUpdated(true);
        setAvatarFile(null);
      } else {
        setAppError(result.value);
      }
    }
  };

  const onLogout = async () => {
    await get('/users/logout');
    clearCsrfToken();
    dispatch<LoggedOut>({ type: 'LOGGED_OUT' });
    history.push('/');
  };
  return (
    <>
      <div css={[mY(6)]}>
        <Button css={[mR(2)]} data-variant="danger" type="button" onClick={onLogout}>
          <Icon sprite={logout} /> 登出账号
        </Button>
      </div>
      <Separator css={[mY(2)]} />
      {updated && <InformationBar variant="SUCCESS">设置已更新</InformationBar>}
      {appError && <InformationBar variant="ERROR">{errorText(appError)}</InformationBar>}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div css={[flex, mT(4)]}>
          <div css={nicknameFieldStyle}>
            <Label htmlFor="nickname">昵称</Label>
            <Input
              css={largeInput}
              defaultValue={profile.user.nickname}
              id="nickname"
              name="nickname"
              ref={register(nicknameValidation)}
            />
            {errors.nickname && <ErrorMessage>{errors.nickname.message}</ErrorMessage>}
          </div>
          <EditAvatar size="8rem" selectFile={setAvatarFile} mediaId={profile.user.avatarId} />
        </div>
        <div>
          <Label htmlFor="bio">简介</Label>
          <TextArea defaultValue={profile.user.bio} id="bio" name="bio" ref={register(bioValidation)} />
        </div>
        <div css={[alignRight]}>
          <Button css={[textLg]} data-variant="primary" type="submit">
            <Icon sprite={save} /> 保存设置
          </Button>
        </div>
      </form>
    </>
  );
}

export default Settings;
