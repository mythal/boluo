import * as React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { EditUser, Settings as SettingsData } from '../../api/users';
import { alignRight, flex, largeInput, mR, mT, spacingN, textLg } from '../../styles/atoms';
import { Label } from '../atoms/Label';
import Input from '../atoms/Input';
import { bioValidation, nicknameValidation } from '../../validators';
import { ErrorMessage } from '../atoms/ErrorMessage';
import Button from '../atoms/Button';
import { AppError } from '../../api/error';
import InformationBar from '../molecules/InformationBar';
import { editAvatar, post } from '../../api/request';
import { useDispatch, useSelector } from '../../store';
import save from '../../assets/icons/save.svg';
import Icon from '../atoms/Icon';
import TextArea from '../atoms/TextArea';
import EditAvatar from '../organisms/EditAvatar';
import { css } from '@emotion/core';
import { RenderError } from '../molecules/RenderError';

const nicknameFieldStyle = css`
  flex-grow: 1;
  margin-right: ${spacingN(2)};
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
`;

interface SettingsForm extends EditUser, SettingsData {}

function Settings() {
  const dispatch = useDispatch();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const user = useSelector((state) => state.profile!.user);
  const settings = useSelector((state) => state.profile!.settings);
  const { register, handleSubmit, errors } = useForm<EditUser>();
  const [submitting, setSubmitting] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [appError, setAppError] = useState<AppError | null>(null);

  const onSubmit = async (data: SettingsForm) => {
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
    const settings: SettingsData = {};
    if (data.enterSend === true || data.enterSend === false) {
      settings.enterSend = data.enterSend;
    }
    if (data.expandDice === true || data.expandDice === false) {
      settings.expandDice = data.expandDice;
    }
    if (Object.keys(settings).length > 0) {
      setSubmitting(true);
      const result = await post('/users/update_settings', settings);
      setSubmitting(false);
      if (!result.isOk) {
        setAppError(result.value);
      } else {
      }
    }
  };

  return (
    <>
      {updated && <InformationBar variant="SUCCESS">设置已更新</InformationBar>}
      {appError && <RenderError error={appError} variant="component" />}
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
        <div>
          <Label>
            <input
              type="checkbox"
              name="enterSend"
              id="enterSend"
              defaultChecked={Boolean(settings.enterSend)}
              ref={register}
              css={[mR(1)]}
            />
            使用回车键发送消息
          </Label>
        </div>
        <div>
          <Label>
            <input
              type="checkbox"
              name="expandDice"
              id="expandDice"
              defaultChecked={Boolean(settings.expandDice)}
              ref={register}
              css={[mR(1)]}
            />
            默认展开每个骰子
          </Label>
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
