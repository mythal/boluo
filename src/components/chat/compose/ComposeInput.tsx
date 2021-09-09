import * as React from 'react';
import { Ref, useCallback, useRef, useState } from 'react';
import { css } from '@emotion/core';
import { useAutoHeight } from '../../../hooks/useAutoHeight';
import { useAtom } from 'jotai';
import { inGameAtom, mediaAtom, sourceAtom } from './state';
import { useChannelId } from '../../../hooks/useChannelId';
import { useSendPreview } from './useSendPreview';

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

function ComposeInput({ autoFocus = false, autoSize = false, className }: Props, ref: Ref<ComposeInputAction>) {
  const channelId = useChannelId();
  const [inGame] = useAtom(inGameAtom, channelId);
  const [media, setMedia] = useAtom(mediaAtom, channelId);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useAutoHeight(autoSize, inputRef);
  const [source, setSource] = useAtom(sourceAtom, channelId);
  const compositing = useRef(false);
  const [dragging, setDragging] = useState(false);

  const placeholder = inGame ? '书写独一无二的冒险吧' : '尽情聊天吧';

  // const appendDice = useCallback(
  //   (command: string) => {
  //     const insertStr = ` {${command}}`;
  //     setValue((value) => value + insertStr);
  //     inputRef.current?.focus();
  //     window.setTimeout(() => {
  //       if (!inputRef.current) {
  //         return;
  //       }
  //       const length = inputRef.current.value.length;
  //       inputRef.current.focus();
  //       inputRef.current.setSelectionRange(length - (command.length + 1), length - 1);
  //       const { text, entities } = parse(inputRef.current.value.trim());
  //       window.clearTimeout(timeout.current);
  //       timeout.current = window.setTimeout(() => {
  //         inputRef.current?.focus();
  //         composeDispatch(update({ text, entities }));
  //       }, 100);
  //     }, 10);
  //   },
  //   [composeDispatch, parse]
  // );

  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    setSource(e.target.value);
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
