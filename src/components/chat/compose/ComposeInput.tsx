import * as React from 'react';
import { Ref, useCallback, useRef, useState } from 'react';
import { css } from '@emotion/core';
import { useAutoHeight } from '../../../hooks/useAutoHeight';
import { useAtom } from 'jotai';
import { editForAtom, inGameAtom, mediaAtom, messageIdAtom, sourceAtom } from './state';
import { useChannelId } from '../../../hooks/useChannelId';
import { useAtomValue, useUpdateAtom } from 'jotai/utils';
import { newId } from '../../../utils/id';

interface Props {
  initialValue?: string;
  autoFocus?: boolean;
  className?: string;
  autoSize?: boolean;
}

const style = css`
  &[data-dragging='true'] {
    filter: blur(1px);
  }
`;

export interface ComposeInputAction {
  appendDice: (command: string) => void;
  reset: () => void;
}

function useAutoFocus(autoFocus: undefined | boolean, inputRef: React.RefObject<HTMLTextAreaElement>) {
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      const input = inputRef.current;
      input.focus();
      const max = 999999;
      input.setSelectionRange(max, max);
    }
  }, [autoFocus, inputRef]);
}

function ComposeInput({ autoFocus = false, autoSize = false, className }: Props, ref: Ref<ComposeInputAction>) {
  const channelId = useChannelId();
  const [inGame] = useAtom(inGameAtom, channelId);
  const [media, setMedia] = useAtom(mediaAtom, channelId);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useAutoHeight(autoSize, inputRef);
  const [source, setSource] = useAtom(sourceAtom, channelId);
  const editFor = useAtomValue(editForAtom);
  const updateMessageId = useUpdateAtom(messageIdAtom, channelId);
  const compositing = useRef(false);
  const [dragging, setDragging] = useState(false);

  const placeholder = inGame ? '书写独一无二的冒险吧' : '尽情聊天吧';
  useAutoFocus(autoFocus, inputRef);

  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    const value = e.target.value;
    if (value.trim() === '' && !editFor) {
      updateMessageId(newId());
    }
    setSource(value);
  };

  const onDrop: React.DragEventHandler = (event) => {
    event.preventDefault();
    setDragging(false);
    const { files } = event.dataTransfer;
    if (files.length > 0) {
      setMedia(files[0]);
    }
  };
  const onDragOver: React.DragEventHandler = useCallback((event) => {
    setDragging(true);
    event.preventDefault();
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.dropEffect = 'copy';
  }, []);
  const onPaste: React.ClipboardEventHandler<HTMLTextAreaElement> = useCallback(
    (e) => {
      if (e.clipboardData.files.length > 0) {
        e.preventDefault();
        setMedia(e.clipboardData.files[0]);
      }
    },
    [setMedia]
  );
  const handleKeyDown: React.KeyboardEventHandler = (e) => {
    if (e.key === 'Enter' && compositing.current) {
      return;
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
      value={source}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={handleChange}
      data-dragging={dragging}
      onCompositionStart={() => (compositing.current = true)}
      onCompositionEnd={() => (compositing.current = false)}
    />
  );
}

export default ComposeInput;
