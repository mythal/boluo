import React, { FormEventHandler, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useDispatch } from '../App/App';
import { checkDisplayName, getErrorMessage } from '../validators';
import { InputField } from '../From/InputField';
import { post } from '../api/request';
import { CONFLICT } from '../api/error';
import { JOINED_SPACE, JoinedSpace } from '../App/actions';

interface Props {}

export const CreateSpacePage: React.FC<Props> = () => {
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const history = useHistory();
  const dispatch = useDispatch();

  const handleName = (value: string) => {
    if (value.length === 0) {
      setNameError('');
    } else if (nameError.length > 0) {
      const checkResult = checkDisplayName(value);
      setNameError(getErrorMessage(checkResult));
    }
    setName(value);
  };

  const allOk = nameError === '' && name.length > 0;

  const handleSubmit: FormEventHandler = async e => {
    e.preventDefault();
    if (!allOk) {
      return;
    }
    const result = await post('/spaces/create', {
      name,
      password: null,
    });
    if (result.isErr && result.value.code === CONFLICT) {
      setNameError('叫做这个名字的位面已经存在了');
      return;
    }
    const { space, member } = result.unwrap();
    dispatch<JoinedSpace>({ tag: JOINED_SPACE, space, member });
    history.push(`/space/${space.id}`);
  };

  return (
    <div>
      <div>
        <h1>创建位面</h1>
        <p>位面是你们冒险发生的地方。</p>
      </div>
      <div>
        <form onSubmit={handleSubmit}>
          <InputField value={name} onChange={handleName} label="位面名" error={nameError} />
          <button type="submit" disabled={!allOk}>
            创建
          </button>
        </form>
      </div>
    </div>
  );
};
