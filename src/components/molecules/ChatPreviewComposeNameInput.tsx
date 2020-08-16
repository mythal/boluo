import * as React from 'react';
import styled from '@emotion/styled';
import { alignRight, p, textSm } from '@/styles/atoms';
import Input from '@/components/atoms/Input';

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

function ChatPreviewComposeNameInput({ value, onChange }: Props) {
  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const { value } = e.target;
    onChange(value.trim().substr(0, 32));
  };

  return (
    <Naming>
      <Input css={[textSm, p(1), alignRight]} value={value} onChange={handleChange} placeholder="写下你的名字" />
    </Naming>
  );
}

export default React.memo(ChatPreviewComposeNameInput);
