import * as React from 'react';
import styled from '@emotion/styled';
import { composeInputStyle, p } from '@/styles/atoms';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const Naming = styled.div`
  grid-area: name;
  display: flex;
  align-items: start;
  justify-content: flex-end;
`;

const NameInput = styled.input`
  ${[p(1), composeInputStyle]};
  text-align: right;
  width: 100%;
  height: 2em;
`;

function ChatPreviewComposeNameInput({ value, onChange }: Props) {
  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const { value } = e.target;
    onChange(value.trim().substr(0, 32));
  };

  return (
    <Naming>
      <NameInput value={value} onChange={handleChange} placeholder="写下你的名字" />
    </Naming>
  );
}

export default ChatPreviewComposeNameInput;
