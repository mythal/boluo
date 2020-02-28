import React, { useState } from 'react';
import { useDispatch } from './App';
import { checkDisplayName } from '../validators';
import { post } from '../api/request';
import { CONFLICT, errorText } from '../api/error';
import { JoinedChannel } from '../states/actions';
import { PlusIcon } from './icons';
import { Dialog } from './Dialog';
import { Input } from './Input';
import { AlertItem } from './AlertItem';
import { Id } from '../id';

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

  const handleCreate: React.FormEventHandler = async e => {
    e.preventDefault();
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
      <Dialog open={open} dismiss={dismiss} className="max-w-sm p-4">
        {error === null ? null : <AlertItem level="ERROR" message={error} />}
        <form className="" onSubmit={handleCreate}>
          <p className="dialog-title">创建频道</p>
          <Input label="名称" value={name} onChange={setName} error={nameError} />
          <div className="mt-4 text-right">
            <button className="btn mr-1" type="button" onClick={dismiss}>
              取消
            </button>
            <button className="btn btn-primary" type="submit" disabled={disabled}>
              创建
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
};
