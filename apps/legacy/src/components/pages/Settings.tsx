import { css } from '@emotion/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { type AppError } from '../../api/error';
import { editAvatar, post } from '../../api/request';
import { type EditUser, type Settings as SettingsData } from '../../api/users';
import Save from '../../assets/icons/save.svg';
import { useDispatch, useSelector } from '../../store';
import { alignRight, flex, largeInput, mR, mT, spacingN, textLg } from '../../styles/atoms';
import { bioValidation, nicknameValidation } from '../../validators';
import Button from '../atoms/Button';
import { ErrorMessage } from '../atoms/ErrorMessage';
import Icon from '../atoms/Icon';
import Input from '../atoms/Input';
import { Label } from '../atoms/Label';
import TextArea from '../atoms/TextArea';
import InformationBar from '../molecules/InformationBar';
import { RenderError } from '../molecules/RenderError';
import EditAvatar from '../organisms/EditAvatar';

const nicknameFieldStyle = css`
  flex-grow: 1;
  margin-right: ${spacingN(2)};
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
`;

interface SettingsForm {
  nickname: string;
  bio: string;
  enterSend?: boolean;
  expandDice?: boolean;
}

function Settings() {
  const dispatch = useDispatch();

  const user = useSelector((state) => state.profile!.user);
  const settings = useSelector((state) => state.profile!.settings);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsForm>();
  const [submitting, setSubmitting] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [appError, setAppError] = useState<AppError | null>(null);

  const onSubmit = async (data: SettingsForm) => {
    if (data.bio !== user.bio || data.nickname !== user.nickname) {
      setSubmitting(true);
      const editPayload: Partial<EditUser> = {
        nickname: data.nickname,
        bio: data.bio,
      };
      const result = await post('/users/edit', editPayload);
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
        dispatch({ type: 'SETTINGS_UPDATED', settings: result.value });
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
              {...register('nickname', nicknameValidation)}
            />
            {errors.nickname && <ErrorMessage>{errors.nickname.message}</ErrorMessage>}
          </div>
          <EditAvatar size="8rem" selectFile={setAvatarFile} mediaId={user.avatarId} />
        </div>
        <div>
          <Label htmlFor="bio">简介</Label>
          <TextArea defaultValue={user.bio} id="bio" {...register('bio', bioValidation)} />
        </div>
        <div>
          <Label>
            <input
              type="checkbox"
              id="enterSend"
              defaultChecked={Boolean(settings.enterSend)}
              css={[mR(1)]}
              {...register('enterSend')}
            />
            使用回车键发送消息
          </Label>
        </div>
        <div>
          <Label>
            <input
              type="checkbox"
              id="expandDice"
              defaultChecked={Boolean(settings.expandDice)}
              css={[mR(1)]}
              {...register('expandDice')}
            />
            默认展开每个骰子
          </Label>
        </div>
        <div css={[alignRight, mT(2)]}>
          <Button css={[textLg]} data-variant="primary" type="submit" disabled={submitting}>
            <Icon icon={Save} loading={submitting} /> 保存设置
          </Button>
        </div>
      </form>
    </>
  );
}

export default Settings;
