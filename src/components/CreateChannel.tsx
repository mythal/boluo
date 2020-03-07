import React, { useState } from 'react';
import { useDispatch } from './Provider';
import { checkDisplayName } from '../validators';
import { post } from '../api/request';
import { CONFLICT, errorText } from '../api/error';
import { JoinedChannel } from '../states/actions';
import { PlusIcon } from './icons';
import { Input } from './Input';
import { Id } from '../id';
import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  spaceId: Id;
  onCreated?: () => void;
}

export const CreateChannel: React.FC<Props> = ({ spaceId }) => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(!open);
  const dismiss = () => setOpen(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const nameError = name.length > 0 ? checkDisplayName(name).err() : null;
  const disabled = name.length === 0 || nameError !== null;

  const handleCreate = async () => {
    setError(null);
    const result = await post('/channels/create', { spaceId, name });
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
    close();
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
      </ConfirmDialog>
    </>
  );
};
