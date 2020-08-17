import * as React from 'react';
import { useRef, useState } from 'react';
import { textBase } from '@/styles/atoms';
import { useParse } from '@/hooks';
import TextArea from '@/components/atoms/TextArea';
import { css } from '@emotion/core';
import { ComposeDispatch } from '@/components/molecules/ChatPreviewCompose';

interface Props {
  inGame: boolean;
  initialValue: string;
  composeDispatch: ComposeDispatch;
  autoFocus?: boolean;
}

const compose = css`
  grid-area: compose;
  ${textBase};
`;

function ChatPreviewComposeInput({ inGame, initialValue, composeDispatch, autoFocus = false }: Props) {
  const [value, setValue] = useState(initialValue);
  const placeholder = inGame ? '书写独一无二的冒险吧' : '尽情聊天吧';
  const timeout = useRef<number | undefined>(undefined);
  const parse = useParse();
  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    const nextValue = e.target.value;
    setValue(nextValue);
    window.clearTimeout(timeout.current);
    timeout.current = window.setTimeout(() => {
      composeDispatch({ parsed: parse(nextValue.trim()) });
    }, 250);
  };
  return (
    <TextArea css={compose} value={value} placeholder={placeholder} autoFocus={autoFocus} onChange={handleChange} />
  );
}

export default React.memo(ChatPreviewComposeInput);
