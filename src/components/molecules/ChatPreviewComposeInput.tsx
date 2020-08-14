import * as React from 'react';
import { textBase } from '@/styles/atoms';
import { useRef, useState } from 'react';
import { ParseResult } from '@/interpreter/parser';
import { useParse } from '@/hooks';
import TextArea from '@/components/atoms/TextArea';
import { css } from '@emotion/core';

interface Props {
  inGame: boolean;
  initialValue: string;
  onChange: (parsed: ParseResult) => void;
}

const compose = css`
  grid-area: compose;
  ${textBase};
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
    <TextArea
      css={compose}
      value={value}
      placeholder={placeholder}
      onCompositionStart={() => (composing.current = true)}
      onCompositionEnd={() => (composing.current = false)}
      onChange={handleChange}
    />
  );
}

export default React.memo(ChatPreviewComposeInput);
