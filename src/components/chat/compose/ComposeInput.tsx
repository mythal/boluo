import * as React from 'react';
import { Ref, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useParse } from '../../../hooks/useParse';
import { ComposeDispatch, update } from './reducer';
import { css } from '@emotion/core';
import { useAutoHeight } from '../../../hooks/useAutoHeight';

interface Props {
  prevSubmit?: number;
  inGame: boolean;
  initialValue: string;
  composeDispatch: ComposeDispatch;
  autoFocus?: boolean;
  className?: string;
  autoSize?: boolean;
  isAction: boolean;
}

const style = css`
  &[data-dragging='true'] {
    filter: blur(1px);
  }
`;

const actionCommand = '.me ';
const ACTION_COMMAND = /[.。]me\s*/;

export interface ComposeInputAction {
  appendDice: () => void;
}

function ComposeInput(
  { prevSubmit, inGame, initialValue, composeDispatch, autoFocus = false, className, isAction }: Props,
  ref: Ref<ComposeInputAction>
) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useAutoHeight(inputRef);
  const [value, setValue] = useState(initialValue);
  const compositing = useRef(false);
  const [dragging, setDragging] = useState(false);

  const placeholder = inGame ? '书写独一无二的冒险吧' : '尽情聊天吧';
  const timeout = useRef<number | undefined>(undefined);
  const parse = useParse();

  const appendDice = useCallback(() => {
    setValue((value) => value + ' {1d}');
    window.setTimeout(() => {
      if (!inputRef.current) {
        return;
      }
      const selection = window.getSelection();
      if (!selection) {
        return;
      }
      const length = inputRef.current.value.length;
      inputRef.current.focus();
      inputRef.current.setSelectionRange(length - 3, length - 1);
      const { text, entities } = parse(inputRef.current.value.trim());
      window.clearTimeout(timeout.current);
      timeout.current = window.setTimeout(() => {
        composeDispatch(update({ text, entities }));
      }, 100);
    }, 10);
  }, [composeDispatch, parse]);

  useImperativeHandle<ComposeInputAction, ComposeInputAction>(
    ref,
    () => {
      return {
        appendDice,
      };
    },
    [appendDice]
  );
  useEffect(() => {
    const matchActionCommand = value.match(ACTION_COMMAND);
    if (isAction && matchActionCommand === null) {
      setValue(actionCommand + value);
    } else if (!isAction && matchActionCommand) {
      setValue(value.substr(matchActionCommand[0].length));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAction]);

  useEffect(() => {
    return () => {
      setValue('');
    };
  }, [prevSubmit]);

  useEffect(() => {
    if (value.match(ACTION_COMMAND)) {
      if (!isAction) {
        composeDispatch(update({ isAction: true }));
      }
    } else {
      if (isAction) {
        composeDispatch(update({ isAction: false }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composeDispatch, value]);

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
  const handleKeyDown: React.KeyboardEventHandler = (e) => {
    if (e.key === 'Enter' && compositing.current) {
      e.stopPropagation();
    }
  };
  const onDragLeave = () => setDragging(false);
  return (
    <textarea
      onKeyDown={handleKeyDown}
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
      onCompositionStart={() => (compositing.current = true)}
      onCompositionEnd={() => (compositing.current = false)}
    />
  );
}

export default React.memo(React.forwardRef<ComposeInputAction, Props>(ComposeInput));
