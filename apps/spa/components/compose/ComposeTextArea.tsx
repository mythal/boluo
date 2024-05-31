import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { type ChangeEventHandler, type FC, type KeyboardEvent, startTransition, useEffect, useMemo, useRef } from 'react';
import { useChannelId } from '../../hooks/useChannelId';
import { type ComposeActionUnion } from '../../state/compose.actions';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { RichTextarea, type RichTextareaHandle } from 'rich-textarea';
import { composeRender } from './render';
import { type ParseResult } from '../../interpreter/parse-result';
import { type ComposeAtom } from '../../hooks/useComposeAtom';
import { chatAtom } from '../../state/chat.atoms';

interface Props {
  myId: string;
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

const style: React.CSSProperties = {
  width: '100%',
  maxHeight: '8rem',
  scrollbarWidth: 'none',
};

export const ComposeTextArea: FC<Props> = ({ parsed, enterSend, send, myId }) => {
  const { composeAtom, parsedAtom } = useChannelAtoms();
  const ref = useRef<RichTextareaHandle | null>(null);
  const channelId = useChannelId();
  const isCompositionRef = useRef(false);
  const dispatch = useSetAtom(composeAtom);
  const store = useStore();
  const lastMessageAtom = useMemo(
    () =>
      selectAtom(chatAtom, (chat) => {
        const channel = chat.channels[channelId];
        if (!channel) return null;
        return channel.messages.findLast((message) => message.senderId === myId) ?? null;
      }),
    [channelId, myId],
  );
  const source = useAtomValue(useMemo(() => selectAtom(composeAtom, (compose) => compose.source), [composeAtom]));

  const lock = useRef(false);
  useEnterKeyHint(enterSend, ref);

  const updateRange = () => {
    startTransition(() => {
      if (lock.current) return;
      const textArea = ref.current;
      if (!textArea) return;
      const { selectionStart, selectionEnd } = textArea;
      dispatch({ type: 'setRange', payload: { range: [selectionStart, selectionEnd] } });
    });
  };

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
    if (isCompositionRef.current) {
      return;
    }
    const compose = store.get(composeAtom);
    if (e.code === 'Escape' && compose.editFor != null) {
      dispatch({ type: 'reset', payload: {} });
      return;
    }
    if (e.code === 'ArrowUp' && compose.editFor == null) {
      const parsed = store.get(parsedAtom);
      const lastMessage = store.get(lastMessageAtom);
      if (parsed.entities.length === 0 && lastMessage) {
        e.preventDefault();
        dispatch({ type: 'editMessage', payload: { message: lastMessage } });
      }
    }
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
      style={style}
      autoHeight
      rows={1}
      className="resize-none px-2 py-2 outline-none"
    >
      {composeRender(parsed)}
    </RichTextarea>
  );
};
