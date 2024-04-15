import type { User } from '@boluo/api';
import { atom, useAtomValue, useSetAtom, useStore } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { ChangeEventHandler, FC, KeyboardEvent, useCallback, useEffect, useMemo, useRef } from 'react';
import { useChannelId } from '../../hooks/useChannelId';
import { useComposeError } from '../../hooks/useComposeError';
import { useQuerySettings } from '../../hooks/useQuerySettings';
import { ComposeActionUnion } from '../../state/compose.actions';
import { useSend } from '../pane-channel/useSend';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import clsx from 'clsx';
import { inputStyle } from '@boluo/ui/TextInput';
import { RichTextarea, RichTextareaHandle } from 'rich-textarea';
import { composeRender } from './render';

interface Props {
  currentUser: User;
}

const focusAction: ComposeActionUnion & { type: 'focus' } = { type: 'focus', payload: {} };
const blurAction: ComposeActionUnion & { type: 'blur' } = { type: 'blur', payload: {} };

export const ComposeTextArea: FC<Props> = ({ currentUser }) => {
  const composeError = useComposeError();
  const send = useSend(currentUser, composeError);
  const ref = useRef<RichTextareaHandle | null>(null);
  const channelId = useChannelId();
  const isCompositionRef = useRef(false);
  const { composeAtom, parsedAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const source = useAtomValue(useMemo(() => selectAtom(composeAtom, (compose) => compose.source), [composeAtom]));
  const store = useStore();
  const rangeAtom = useMemo(() => selectAtom(composeAtom, (compose) => compose.range), [composeAtom]);
  const defaultInGameAtom = useMemo(() => selectAtom(composeAtom, (compose) => compose.defaultInGame), [composeAtom]);
  const inGameAtom = useMemo(
    () => atom((get) => get(parsedAtom).inGame ?? get(defaultInGameAtom) ?? false),
    [defaultInGameAtom, parsedAtom],
  );
  const parsed = useAtomValue(parsedAtom);
  const isWhisper = parsed.whisperToUsernames !== null;
  const inGame = useAtomValue(inGameAtom);
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
        // textArea.focus();
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
