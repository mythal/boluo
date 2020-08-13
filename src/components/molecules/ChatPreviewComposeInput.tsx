import * as React from 'react';
import styled from '@emotion/styled';
import { composeInputStyle, p } from '@/styles/atoms';
import { useRef, useState } from 'react';
import { ParseResult } from '@/interpreter/parser';
import { useParse } from '@/hooks';

interface Props {
  inGame: boolean;
  initialValue: string;
  onChange: (parsed: ParseResult) => void;
}

const Compose = styled.textarea`
  ${[p(2), composeInputStyle]};
  grid-area: compose;
  resize: none;
  &:focus {
    outline: none;
  }
`;

function ChatPreviewComposeInput({ inGame, initialValue, onChange }: Props) {
  const [value, setValue] = useState(initialValue);
  const placeholder = inGame ? '书写独一无二的冒险吧' : '尽情聊天吧';
  const timeout = useRef<number | undefined>(undefined);
  const composing = useRef<boolean>(false);
  const parse = useParse();
  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    const nextValue = e.target.value;
    setValue(nextValue);
    if (composing.current) {
      return;
    }
    window.clearTimeout(timeout.current);
    timeout.current = window.setTimeout(() => {
      onChange(parse(nextValue.trim()));
    }, 200);
  };
  return (
    <Compose
      value={value}
      placeholder={placeholder}
      onCompositionStart={() => (composing.current = true)}
      onCompositionEnd={() => (composing.current = false)}
      onChange={handleChange}
    />
  );
}

export default React.memo(ChatPreviewComposeInput);
