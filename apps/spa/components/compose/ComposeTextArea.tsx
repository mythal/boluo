import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { selectAtom } from 'jotai/utils';
import {
  type ChangeEventHandler,
  type FC,
  type KeyboardEvent,
  startTransition,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useChannelId } from '../../hooks/useChannelId';
import { type ComposeActionUnion } from '../../state/compose.actions';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { RichTextarea, type RichTextareaHandle } from 'rich-textarea';
import { composeRender } from './render';
import { type ParseResult } from '../../interpreter/parse-result';
import { type ComposeAtom } from '../../hooks/useComposeAtom';
import { chatAtom } from '../../state/chat.atoms';
import * as L from 'list';
import screens from '@boluo/ui/screens.json';

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

const MAX_FIND_LENGTH = 64;

export const ComposeTextArea: FC<Props> = ({ parsed, enterSend, send, myId }) => {
  const { composeAtom, parsedAtom, composeFocusedAtom, hideSelfPreviewTimeoutAtom } = useChannelAtoms();
  const fixHeight = useAtomValue(composeFocusedAtom) && window.innerWidth < screens.md;
  const setSelfPreviewLock = useSetAtom(hideSelfPreviewTimeoutAtom);
  const ref = useRef<RichTextareaHandle | null>(null);
  const channelId = useChannelId();
  const isCompositionRef = useRef(false);
  const dispatch = useSetAtom(composeAtom);
  const store = useStore();
  const style = useMemo(
    (): React.CSSProperties => ({
      width: '100%',
      height: fixHeight ? '12rem' : undefined,
      maxHeight: fixHeight ? undefined : '10rem',
      scrollbarWidth: 'none',
      WebkitTextSizeAdjust: 'none',
      MozTextSizeAdjust: 'none',
      textSizeAdjust: 'none',
    }),
    [fixHeight],
  );
  const lastMessageAtom = useMemo(
    () =>
      selectAtom(chatAtom, (chat) => {
        const channel = chat.channels[channelId];
        if (!channel) return null;
        const len = channel.messages.length;
        if (len === 0) return null;
        let count = 0;
        for (const message of L.backwards(channel.messages)) {
          if (message.folded) continue;
          if (message.senderId === myId) {
            return message;
          }
          if (++count >= MAX_FIND_LENGTH) break;
        }
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
    if (e.code === 'Escape' && compose.edit != null) {
      dispatch({ type: 'reset', payload: {} });
      return;
    }
    if (e.code === 'ArrowUp' && compose.edit == null) {
      const parsed = store.get(parsedAtom);
      const lastMessage = store.get(lastMessageAtom);
      if (parsed.entities.length === 0 && lastMessage) {
        const textArea = e.target;
        if (!(textArea instanceof HTMLTextAreaElement)) return;

        // https://stackoverflow.com/a/9185820
        // As the comment in the above link says, this solution is not perfect.
        // But in our case, the text is unlikely to overflow the textarea.
        const lineCount = textArea.value.substring(0, textArea.selectionStart).split('\n').length;
        if (lineCount !== 1) return;
        e.preventDefault();
        dispatch({ type: 'editMessage', payload: { message: lastMessage } });
      }
    }
    if (isCompositionRef.current || e.key !== 'Enter') {
      return;
    }
    if (enterSend) {
      if (!e.shiftKey) {
        e.preventDefault();
        await send();
      }
    } else {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
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
      onClick={() => setSelfPreviewLock(Date.now() + 1000 * 6)}
      onPasteCapture={handlePaste}
      onCompositionStart={() => (isCompositionRef.current = true)}
      onCompositionEnd={() => (isCompositionRef.current = false)}
      onKeyDown={handleKeyDown}
      data-variant="normal"
      onSelectionChange={updateRange}
      style={style}
      autoHeight={!fixHeight}
      rows={1}
      className="resize-none px-2 py-2 outline-none"
    >
      {composeRender(parsed)}
    </RichTextarea>
  );
};
