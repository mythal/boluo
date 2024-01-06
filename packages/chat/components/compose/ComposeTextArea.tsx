import { GetMe } from 'api';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { ChangeEventHandler, FC, KeyboardEvent, useCallback, useEffect, useMemo, useRef } from 'react';
import { useChannelId } from '../../hooks/useChannelId';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { useComposeError } from '../../hooks/useComposeError';
import { useQuerySettings } from '../../hooks/useQuerySettings';
import { ComposeActionUnion } from '../../state/compose.actions';
import { useSend } from '../pane-channel/useSend';

interface Props {
  me: GetMe;
}

const focusAction: ComposeActionUnion & { type: 'focus' } = { type: 'focus', payload: {} };
const blurAction: ComposeActionUnion & { type: 'blur' } = { type: 'blur', payload: {} };

export const ComposeTextArea: FC<Props> = ({ me }) => {
  const composeError = useComposeError();
  const send = useSend(me.user, composeError);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const channelId = useChannelId();
  const isCompositionRef = useRef(false);
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const source = useAtomValue(useMemo(() => selectAtom(composeAtom, (compose) => compose.source), [composeAtom]));
  const store = useStore();
  const rangeAtom = useMemo(() => selectAtom(composeAtom, (compose) => compose.range), [composeAtom]);
  const { data: settings } = useQuerySettings();
  const enterSend = settings?.enterSend === true;
  const lock = useRef(false);
  const updateRangeTimeout = useRef<number | undefined>(undefined);

  const updateRange = useCallback(() => {
    window.clearTimeout(updateRangeTimeout.current);
    updateRangeTimeout.current = window.setTimeout(() => {
      if (lock.current) return;
      const textArea = ref.current;
      if (!textArea) return;
      const { selectionStart, selectionEnd } = textArea;
      dispatch({ type: 'setRange', payload: { range: [selectionStart, selectionEnd] } });
    }, 20);
  }, [dispatch]);

  useEffect(
    () =>
      store.sub(rangeAtom, () => {
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
        textArea.focus();
        setTimeout(() => {
          textArea.setSelectionRange(a, b);
          lock.current = false;
        });
      }),
    [rangeAtom, store],
  );

  const handleChange: ChangeEventHandler<HTMLTextAreaElement> = useCallback(
    (e) => {
      const { value } = e.target;
      updateRange();
      dispatch({
        type: 'setSource',
        payload: { channelId, source: value },
      });
    },
    [channelId, dispatch, updateRange],
  );
  useEffect(() => {
    const handle = (e: Event) => {
      const selection = document.getSelection();
      if (!selection) return;
      const textArea = ref.current;
      if (!textArea) return;
      if (document.activeElement !== textArea) return;
      updateRange();
    };
    document.addEventListener('selectionchange', handle);
    return () => document.removeEventListener('selectionchange', handle);
  }, [updateRange]);

  const handlePaste: React.ClipboardEventHandler<HTMLTextAreaElement> = useCallback(
    (e) => {
      const files = e.clipboardData.files;
      if (files.length === 0) return;
      e.preventDefault();
      const media = files[0]!;
      dispatch({ type: 'media', payload: { media } });
    },
    [dispatch],
  );

  const handleKeyDown = useCallback(
    async (e: KeyboardEvent<HTMLTextAreaElement>) => {
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
    },
    [send, enterSend],
  );

  useEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.enterKeyHint = enterSend ? 'send' : 'enter';
  }, [enterSend]);

  return (
    <textarea
      ref={ref}
      value={source}
      onChange={handleChange}
      onFocus={() => dispatch(focusAction)}
      onBlur={() => dispatch(blurAction)}
      onPasteCapture={handlePaste}
      onCompositionStart={() => (isCompositionRef.current = true)}
      onCompositionEnd={() => (isCompositionRef.current = false)}
      onKeyDown={handleKeyDown}
      className="input input-default w-full h-full resize-none"
    ></textarea>
  );
};
