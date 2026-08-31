import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { type AppError } from '../../api/error';
import { editAvatar, post } from '../../api/request';
import { type EditUser, type Settings as SettingsData } from '../../api/users';
import Save from '@boluo/icons/legacy/Save';
import { useDispatch, useSelector } from '../../store';
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
        <div className="mt-4 flex">
          <div className="mr-2 flex flex-grow flex-col justify-end">
            <Label htmlFor="nickname">昵称</Label>
            <Input
              className="h-10"
              defaultValue={user.nickname}
              id="nickname"
              inputSize="large"
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
              className="legacy-checkbox-spaced"
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
              className="legacy-checkbox-spaced"
              {...register('expandDice')}
            />
            默认展开每个骰子
          </Label>
        </div>
        <div className="mt-2 text-right">
          <Button size="large" variant="primary" type="submit" disabled={submitting}>
            <Icon icon={Save} loading={submitting} /> 保存设置
          </Button>
        </div>
      </form>
    </>
  );
}

export default Settings;
