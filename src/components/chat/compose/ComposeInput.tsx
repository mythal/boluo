import * as React from 'react';
import { Ref, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useParse } from '../../../hooks/useParse';
import { ComposeDispatch, ComposeState, update } from './reducer';
import { css } from '@emotion/core';
import { useAutoHeight } from '../../../hooks/useAutoHeight';

interface Props {
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
const ACTION_COMMAND = /^[.。]me\s*/;

export interface ComposeInputAction {
  appendDice: () => void;
  reset: () => void;
}

function ComposeInput(
  { inGame, initialValue, composeDispatch, autoFocus = false, autoSize = false, className, isAction }: Props,
  ref: Ref<ComposeInputAction>
) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useAutoHeight(autoSize, inputRef);
  const [value, setValue] = useState(initialValue);
  const compositing = useRef(false);
  const [dragging, setDragging] = useState(false);

  const placeholder = inGame ? '书写独一无二的冒险吧' : '尽情聊天吧';
  const timeout = useRef<number | undefined>(undefined);
  const parse = useParse();

  const reset = useCallback(() => {
    setValue('');
    if (inputRef.current) {
      inputRef.current.style.height = '';
    }
  }, []);

  const appendDice = useCallback(() => {
    setValue((value) => value + ' {1d}');
    inputRef.current?.focus();
    window.setTimeout(() => {
      if (!inputRef.current) {
        return;
      }
      const length = inputRef.current.value.length;
      inputRef.current.focus();
      inputRef.current.setSelectionRange(length - 3, length - 1);
      const { text, entities } = parse(inputRef.current.value.trim());
      window.clearTimeout(timeout.current);
      timeout.current = window.setTimeout(() => {
        inputRef.current?.focus();
        composeDispatch(update({ text, entities }));
      }, 100);
    }, 10);
  }, [composeDispatch, parse]);

  useEffect(() => {
    setValue((value) => {
      const matchActionCommand = value.match(ACTION_COMMAND);
      if (isAction && matchActionCommand === null) {
        return actionCommand + value;
      } else if (!isAction && matchActionCommand) {
        return value.substr(matchActionCommand[0].length);
      }
      return value;
    });
  }, [isAction]);

  useImperativeHandle<ComposeInputAction, ComposeInputAction>(
    ref,
    () => {
      return {
        appendDice,
        reset,
      };
    },
    [appendDice, reset]
  );

  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    const nextValue = e.target.value;
    setValue(nextValue);
    window.clearTimeout(timeout.current);
    timeout.current = window.setTimeout(() => {
      const { text, entities } = parse(nextValue.trim());
      const updater: Partial<ComposeState> = { text, entities };
      if (nextValue.match(ACTION_COMMAND)) {
        if (!isAction) {
          updater.isAction = true;
        }
      } else {
        if (isAction) {
          updater.isAction = false;
        }
      }
      composeDispatch(update(updater));
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
