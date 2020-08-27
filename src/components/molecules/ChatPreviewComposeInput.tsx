import * as React from 'react';
import { useRef, useState } from 'react';
import { textBase } from '../../styles/atoms';
import TextArea from '../../components/atoms/TextArea';
import { css } from '@emotion/core';
import { ComposeDispatch } from './ChatPreviewCompose';
import { useParse } from '../../hooks/useParse';
import { blue } from '../../styles/colors';

interface Props {
  inGame: boolean;
  initialValue: string;
  composeDispatch: ComposeDispatch;
  autoFocus?: boolean;
}

const compose = css`
  grid-area: compose;
  ${textBase};

  &[data-dragging='true'] {
    background-color: ${blue['900']};
  }
`;

function ChatPreviewComposeInput({ inGame, initialValue, composeDispatch, autoFocus = false }: Props) {
  const [value, setValue] = useState(initialValue);
  const [dragging, setDragging] = useState(false);
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

  const onDrop: React.DragEventHandler = (event) => {
    event.preventDefault();
    setDragging(false);
    const { files } = event.dataTransfer;
    if (files.length > 0) {
      const media = files[0];
      composeDispatch({ media });
    }
  };
  const onDragOver: React.DragEventHandler = (event) => {
    setDragging(true);
    event.preventDefault();
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.dropEffect = 'copy';
  };
  const onPaste: React.ClipboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.clipboardData.files.length > 0) {
      e.preventDefault();
      composeDispatch({ media: e.clipboardData.files[0] });
    }
  };
  const onDragLeave = () => setDragging(false);
  return (
    <TextArea
      onPaste={onPaste}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      css={compose}
      value={value}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={handleChange}
      data-dragging={dragging}
    />
  );
}

export default React.memo(ChatPreviewComposeInput);
