import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useDispatch } from '../Provider';
import { checkDescription, checkDisplayName } from '../../validators';
import { post } from '../../api/request';
import { CONFLICT, errorText } from '../../api/error';
import { PlusIcon } from '../icons';
import { Input } from '../Input';
import { ConfirmDialog } from '../ConfirmDialog';
import { Tooltip } from '../Tooltip';
import { SelectDefaultDice } from '../SelectDefaultDice';
import { JoinedSpace } from '../../actions/profile';

export const CreateSpace: React.FC = () => {
  const history = useHistory();
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(!open);
  const dismiss = () => setOpen(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState<string>('');
  const [defaultDiceType, setDefaultDiceType] = useState<string>('d20');
  const [error, setError] = useState<string | null>(null);
  const nameError = name.length > 0 ? checkDisplayName(name).err() : null;
  const descriptionError = checkDescription(description).err();
  const disabled = name.length === 0 || nameError !== null;

  const handleCreate = async () => {
    setError(null);
    const result = await post('/spaces/create', {
      name,
      password: null,
      description,
      defaultDiceType,
    });
    if (result.isErr) {
      if (result.value.code === CONFLICT) {
        setError('叫做这个名字的位面已经存在了');
      } else {
        setError(errorText(result.value));
      }
      return;
    }
    const { space, member } = result.value;
    dispatch<JoinedSpace>({ type: 'JOINED_SPACE', space, member });
    history.push(`/space/${space.id}`);
    dismiss();
  };

  return (
    <>
      <Tooltip message={<div>创建位面</div>}>
        <button className="sidebar-btn" onClick={toggle}>
          <PlusIcon />
        </button>
      </Tooltip>
      <ConfirmDialog
        open={open}
        dismiss={dismiss}
        className="max-w-sm p-4"
        submit={handleCreate}
        confirmText="创建"
        error={error}
        disabled={disabled}
      >
        <p className="dialog-title">创建位面</p>
        <p className="text-sm my-2">集结你的队友，进入位面开始冒险吧。</p>
        <Input label="名称" value={name} onChange={setName} error={nameError} />
        <Input label="简介" value={description} onChange={setDescription} error={descriptionError} />
        <div className="my-2">
          <SelectDefaultDice value={defaultDiceType} setValue={setDefaultDiceType} />
        </div>
      </ConfirmDialog>
    </>
  );
};
