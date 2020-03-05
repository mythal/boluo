import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useDispatch } from './App';
import { checkDisplayName } from '../validators';
import { post } from '../api/request';
import { CONFLICT, errorText } from '../api/error';
import { JoinedSpace } from '../states/actions';
import { PlusIcon } from './icons';
import { Dialog } from './Dialog';
import { Input } from './Input';
import { AlertItem } from './AlertItem';

export const CreateSpace: React.FC = () => {
  const history = useHistory();
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
    const result = await post('/spaces/create', {
      name,
      password: null,
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
      <button className="btn my-2 text-xs" onClick={toggle}>
        <PlusIcon className="mr-2" />
        新位面
      </button>
      <Dialog open={open} dismiss={dismiss} className="max-w-sm p-4">
        {error === null ? null : <AlertItem level="ERROR" message={error} />}
        <form className="" onSubmit={handleCreate}>
          <p className="dialog-title">创建位面</p>
          <p className="text-sm my-2">集结你的队友，进入位面开始冒险吧。</p>
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
