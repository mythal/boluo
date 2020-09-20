import * as React from 'react';
import styled from '@emotion/styled';
import { p, textSm } from '../../../styles/atoms';
import Input from '../../atoms/Input';
import { ComposeDispatch, update } from './reducer';

interface Props {
  value: string;
  composeDispatch: ComposeDispatch;
}

const Naming = styled.div`
  grid-area: name;
  display: flex;
`;

function EditComposeNameInput({ value, composeDispatch }: Props) {
  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const { value } = e.target;
    composeDispatch(update({ inputName: value.trim().substr(0, 32) }));
  };

  return (
    <Naming>
      <Input css={[textSm, p(1)]} value={value} onChange={handleChange} placeholder="写下你的名字" />
    </Naming>
  );
}

export default React.memo(EditComposeNameInput);
