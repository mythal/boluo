import type { User } from '@boluo/api';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { ChangeEventHandler, FC, KeyboardEvent, useCallback, useEffect, useMemo, useRef } from 'react';
import { useChannelId } from '../../hooks/useChannelId';
import { ComposeActionUnion } from '../../state/compose.actions';
import { useSend } from '../pane-channel/useSend';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import clsx from 'clsx';
import { inputStyle } from '@boluo/ui/TextInput';
import { RichTextarea, RichTextareaHandle } from 'rich-textarea';
import { composeRender } from './render';
import { ParseResult } from '../../interpreter/parse-result';
import { ComposeAtom } from '../../hooks/useComposeAtom';

interface Props {
  parsed: ParseResult;
  enterSend: boolean;
  send: () => Promise<void>;
}

const focusAction: ComposeActionUnion & { type: 'focus' } = { type: 'focus', payload: {} };
const blurAction: ComposeActionUnion & { type: 'blur' } = { type: 'blur', payload: {} };

const useEnterKeyHint = (enterSend: boolean, ref: React.RefObject<RichTextareaHandle>) =>
  useEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.enterKeyHint = enterSend ? 'send' : 'enter';
  }, [enterSend, ref]);

const useReflectRangeChange = (
  composeAtom: ComposeAtom,
  lock: React.MutableRefObject<boolean>,
  ref: React.RefObject<RichTextareaHandle>,
) => {
  const store = useStore();

  const rangeAtom = useMemo(() => selectAtom(composeAtom, (compose) => compose.range), [composeAtom]);
  return useEffect(() => {
    return store.sub(rangeAtom, () => {
      const range = store.get(rangeAtom);
      const textArea = ref.current;
      if (!range || !textArea) {
        return;
      }
      const [a, b] = range;
      if (textArea.selectionStart === a && textArea.selectionEnd === b) {
        return;
      }
      lock.current = true;
      // textArea.focus();
      setTimeout(() => {
        textArea.setSelectionRange(a, b);
        lock.current = false;
      });
    });
  }, [lock, rangeAtom, ref, store]);
};

export const ComposeTextArea: FC<Props> = ({ parsed, enterSend, send }) => {
  const { composeAtom, inGameAtom } = useChannelAtoms();
  const ref = useRef<RichTextareaHandle | null>(null);
  const channelId = useChannelId();
  const isCompositionRef = useRef(false);
  const dispatch = useSetAtom(composeAtom);
  const source = useAtomValue(useMemo(() => selectAtom(composeAtom, (compose) => compose.source), [composeAtom]));

  const isWhisper = parsed.whisperToUsernames !== null;
  const inGame = useAtomValue(inGameAtom);
  const lock = useRef(false);
  const updateRangeTimeout = useRef<number | undefined>(undefined);
  useEnterKeyHint(enterSend, ref);

  const updateRange = useCallback(() => {
    window.clearTimeout(updateRangeTimeout.current);
    updateRangeTimeout.current = window.setTimeout(() => {
      if (lock.current) return;
      const textArea = ref.current;
      if (!textArea) return;
      const { selectionStart, selectionEnd } = textArea;
      dispatch({ type: 'setRange', payload: { range: [selectionStart, selectionEnd] } });
    }, 30);
  }, [dispatch]);

  useReflectRangeChange(composeAtom, lock, ref);

  const handleChange: ChangeEventHandler<HTMLTextAreaElement> = (e) => {
    const { value } = e.target;
    updateRange();
    dispatch({
      type: 'setSource',
      payload: { channelId, source: value },
    });
  };

  const handlePaste: React.ClipboardEventHandler<HTMLTextAreaElement> = (e) => {
    const files = e.clipboardData.files;
    if (files.length === 0) return;
    e.preventDefault();
    const media = files[0]!;
    dispatch({ type: 'media', payload: { media } });
  };

  const handleKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isCompositionRef.current || e.key !== 'Enter') {
      return;
    }
    if (enterSend) {
      if (!e.shiftKey) {
        await send();
      }
    } else {
      if (e.ctrlKey || e.metaKey) {
        await send();
      }
    }
  };
  return (
    <RichTextarea
      ref={ref}
      value={source}
      onChange={handleChange}
      onFocus={() => dispatch(focusAction)}
      onBlur={() => dispatch(blurAction)}
      onPasteCapture={handlePaste}
      onCompositionStart={() => (isCompositionRef.current = true)}
      onCompositionEnd={() => (isCompositionRef.current = false)}
      onKeyDown={handleKeyDown}
      data-variant="normal"
      onSelectionChange={updateRange}
      style={{ width: '100%', height: '4rem' }}
      className={clsx(inputStyle('normal'), isWhisper ? 'border-dashed' : '', inGame ? 'bg-message-inGame-bg' : '')}
    >
      {composeRender(parsed)}
    </RichTextarea>
  );
};
