import React, { useState } from 'react';
import { useDispatch } from './Provider';
import { checkCharacterName, checkDisplayName } from '../validators';
import { post } from '../api/request';
import { CONFLICT, errorText } from '../api/error';
import { PlusIcon } from './icons';
import { Input } from './Input';
import { Id } from '../utils';
import { ConfirmDialog } from './ConfirmDialog';
import { SelectDefaultDice } from './SelectDefaultDice';
import { JoinedChannel } from '../actions/profile';

interface Props {
  spaceId: Id;
  spaceDefaultDiceType: string;
  onCreated?: () => void;
}

export const CreateChannel: React.FC<Props> = ({ spaceId, spaceDefaultDiceType, onCreated }) => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(!open);
  const dismiss = () => setOpen(false);
  const [name, setName] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [defaultDiceType, setDefaultDiceType] = useState<string>(spaceDefaultDiceType);
  const [error, setError] = useState<string | null>(null);
  const nameError = name.length > 0 ? checkDisplayName(name).err() : null;
  const characterNameError = characterName.length > 0 ? checkCharacterName(characterName).err() : null;
  const disabled = name.length === 0 || nameError !== null || characterNameError !== null;

  const handleCreate = async () => {
    setError(null);
    const result = await post('/channels/create', { spaceId, name, defaultDiceType, characterName });
    if (result.isErr) {
      if (result.value.code === CONFLICT) {
        setError(`已经存在名叫「${name}」的频道了。`);
      } else {
        setError(errorText(result.value));
      }
      return;
    }
    const { channel, member } = result.value;
    dispatch<JoinedChannel>({ type: 'JOINED_CHANNEL', channel, member });
    dismiss();
    if (onCreated) {
      onCreated();
    }
  };

  return (
    <>
      <button className="btn my-2 text-xs" onClick={toggle}>
        <PlusIcon className="mr-2" />
        新频道
      </button>
      <ConfirmDialog
        open={open}
        dismiss={dismiss}
        submit={handleCreate}
        confirmText="创建"
        error={error}
        disabled={disabled}
      >
        <p className="dialog-title">创建频道</p>
        <Input label="名称" value={name} onChange={setName} error={nameError} />
        <Input
          label="你的角色名（可选）"
          value={characterName}
          onChange={setCharacterName}
          error={characterNameError}
        />
        <div className="my-2">
          <SelectDefaultDice value={defaultDiceType} setValue={setDefaultDiceType} />
        </div>
      </ConfirmDialog>
    </>
  );
};
