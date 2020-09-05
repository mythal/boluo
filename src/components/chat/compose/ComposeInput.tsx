import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useParse } from '../../../hooks/useParse';
import { ComposeDispatch, update } from './reducer';
import { css } from '@emotion/core';
import { useAutoHeight } from '../../../hooks/useAutoHeight';

interface Props {
  id: string;
  inGame: boolean;
  initialValue: string;
  composeDispatch: ComposeDispatch;
  autoFocus?: boolean;
  className?: string;
  autoSize?: boolean;
}

const style = css`
  &[data-dragging='true'] {
    filter: blur(1px);
  }
`;

function ComposeInput({
  id,
  inGame,
  initialValue,
  composeDispatch,
  autoFocus = false,
  className,
  autoSize = false,
}: Props) {
  const [value, setValue] = useState(initialValue);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue('');
    if (inputRef.current) {
      inputRef.current.style.height = '';
    }
  }, [id]);
  useAutoHeight(autoSize, value, inputRef);
  const placeholder = inGame ? '书写独一无二的冒险吧' : '尽情聊天吧';
  const timeout = useRef<number | undefined>(undefined);
  const parse = useParse();

  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    const nextValue = e.target.value;
    setValue(nextValue);
    window.clearTimeout(timeout.current);
    timeout.current = window.setTimeout(() => {
      const { text, entities } = parse(nextValue.trim());
      composeDispatch(update({ text, entities }));
    }, 250);
  };

  const onDrop: React.DragEventHandler = (event) => {
    event.preventDefault();
    setDragging(false);
    const { files } = event.dataTransfer;
    if (files.length > 0) {
      const media = files[0];
      composeDispatch(update({ media }));
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
      composeDispatch(update({ media: e.clipboardData.files[0] }));
    }
  };
  const onDragLeave = () => setDragging(false);
  return (
    <textarea
      onPaste={onPaste}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      ref={inputRef}
      css={style}
      className={className}
      value={value}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={handleChange}
      data-dragging={dragging}
    />
  );
}

export default React.memo(ComposeInput);
