import { css } from '@emotion/react';
import * as React from 'react';
import { type Ref, useCallback, useEffect, useRef, useState } from 'react';
import { useAutoHeight } from '../../../hooks/useAutoHeight';
import { useChannelId } from '../../../hooks/useChannelId';
import { useDispatch, useSelector } from '../../../store';

interface Props {
  initialValue?: string;
  autoFocus?: boolean;
  className?: string;
  autoSize?: boolean;
  ref?: Ref<ComposeInputAction>;
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

function useAutoFocus(
  autoFocus: undefined | boolean,
  inputRef: React.RefObject<HTMLTextAreaElement | null>,
) {
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      const input = inputRef.current;
      input.focus();
      const max = 999999;
      input.setSelectionRange(max, max);
    }
  }, [autoFocus, inputRef]);
}

function ComposeInput({ autoFocus = false, autoSize = false, className }: Props) {
  const dispatch = useDispatch();
  const channelId = useChannelId();
  const inGame = useSelector((state) => state.chatStates.get(channelId)!.compose.inGame);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  useAutoHeight(autoSize, inputRef);
  const source = useSelector((state) => state.chatStates.get(channelId)!.compose.source);
  const setSource = useCallback(
    (source: string) => {
      dispatch({ type: 'SET_COMPOSE_SOURCE', pane: channelId, source });
    },
    [channelId, dispatch],
  );
  const compositing = useRef(false);
  const [dragging, setDragging] = useState(false);
  const setMedia = useCallback(
    (media: File | undefined) => dispatch({ type: 'SET_COMPOSE_MEDIA', pane: channelId, media }),
    [channelId, dispatch],
  );

  const placeholder = inGame ? '书写独一无二的冒险吧' : '尽情聊天吧';
  useAutoFocus(autoFocus, inputRef);

  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    const value = e.target.value;
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
    [setMedia],
  );
  const handleKeyDown: React.KeyboardEventHandler = (e) => {
    if (e.key === 'Enter' && compositing.current) {
      e.stopPropagation();
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
      onChange={handleChange}
      data-dragging={dragging}
      onCompositionStart={() => (compositing.current = true)}
      onCompositionEnd={() => (compositing.current = false)}
    />
  );
}

export default ComposeInput;
