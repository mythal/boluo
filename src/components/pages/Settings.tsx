import * as React from 'react';
import { useForm } from 'react-hook-form';
import { EditUser } from '@/api/users';
import { alignRight, flex, largeInput, mT, spacingN, textLg } from '@/styles/atoms';
import { Label } from '../atoms/Label';
import Input from '../atoms/Input';
import { bioValidation, nicknameValidation } from '@/validators';
import { ErrorMessage } from '../atoms/ErrorMessage';
import Button from '../atoms/Button';
import { useState } from 'react';
import { AppError, errorText } from '@/api/error';
import InformationBar from '../molecules/InformationBar';
import { editAvatar, post } from '@/api/request';
import { useDispatch, useSelector } from '@/store';
import save from '@/assets/icons/save.svg';
import Icon from '../atoms/Icon';
import TextArea from '../atoms/TextArea';
import EditAvatar from '../organisms/EditAvatar';
import { css } from '@emotion/core';

const nicknameFieldStyle = css`
  flex-grow: 1;
  margin-right: ${spacingN(2)};
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
`;

function Settings() {
  const dispatch = useDispatch();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const user = useSelector((state) => state.profile!.user);
  const { register, handleSubmit, errors } = useForm<EditUser>();
  const [submitting, setSubmitting] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [appError, setAppError] = useState<AppError | null>(null);

  const onSubmit = async (data: EditUser) => {
    if (data.bio !== user.bio || data.nickname !== user.nickname) {
      setSubmitting(true);
      const result = await post('/users/edit', data);
      setSubmitting(false);
      if (!result.isOk) {
        setAppError(result.value);
      } else {
        const user = result.value;
        dispatch({ type: 'USER_EDITED', user });
        setUpdated(true);
      }
    }
    if (avatarFile) {
      setSubmitting(true);
      const result = await editAvatar(avatarFile, avatarFile.name, avatarFile.type);
      setSubmitting(false);
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

  return (
    <>
      {updated && <InformationBar variant="SUCCESS">设置已更新</InformationBar>}
      {appError && <InformationBar variant="ERROR">{errorText(appError)}</InformationBar>}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div css={[flex, mT(4)]}>
          <div css={nicknameFieldStyle}>
            <Label htmlFor="nickname">昵称</Label>
            <Input
              css={largeInput}
              defaultValue={user.nickname}
              id="nickname"
              name="nickname"
              ref={register(nicknameValidation)}
            />
            {errors.nickname && <ErrorMessage>{errors.nickname.message}</ErrorMessage>}
          </div>
          <EditAvatar size="8rem" selectFile={setAvatarFile} mediaId={user.avatarId} />
        </div>
        <div>
          <Label htmlFor="bio">简介</Label>
          <TextArea defaultValue={user.bio} id="bio" name="bio" ref={register(bioValidation)} />
        </div>
        <div css={[alignRight, mT(2)]}>
          <Button css={[textLg]} data-variant="primary" type="submit" disabled={submitting}>
            <Icon sprite={save} loading={submitting} /> 保存设置
          </Button>
        </div>
      </form>
    </>
  );
}

export default Settings;
