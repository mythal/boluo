import React, { useState } from 'react';
import { useDispatch } from '../App/App';
import { checkDisplayName, getErrorMessage } from '../validators';
import { InputField } from '../From/InputField';
import { post } from '../api/request';
import { Id } from '../id';
import { CONFLICT } from '../api/error';
import { JOINED_CHANNEL, JoinedChannel } from '../App/actions';

interface Props {
  spaceId: Id;
  onCreated: () => void;
}

export const CreateChannel: React.FC<Props> = ({ spaceId, onCreated }) => {
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const dispatch = useDispatch();

  const isDisabled = name.length === 0 || nameError.length > 0;

  const handleName = (value: string) => {
    if (value.length > 0) {
      setNameError(getErrorMessage(checkDisplayName(value || '')));
    } else if (nameError.length > 0) {
      setNameError('');
    }
    setName(value);
  };

  const handleSubmit: React.FormEventHandler = async e => {
    e.preventDefault();
    if (isDisabled) {
      return;
    }
    const result = await post('/channels/create', { spaceId, name });
    if (result.isErr && result.value.code === CONFLICT) {
      setNameError(`已经存在名叫「${name}」的频道了。`);
    }
    const { channel, member } = result.unwrap();
    dispatch<JoinedChannel>({ tag: JOINED_CHANNEL, channel, member });
    onCreated();
  };

  return (
    <form className="max-w-sm" onSubmit={handleSubmit}>
      <InputField value={name} onChange={handleName} label="频道名" error={nameError} />
      <button className="btn p-1" type="submit" disabled={isDisabled}>
        创建
      </button>
    </form>
  );
};
