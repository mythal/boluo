import { useAtomValue, useSetAtom, useStore, type Atom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import {
  type ChangeEventHandler,
  type FC,
  type KeyboardEvent,
  type PointerEventHandler,
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
import { type ParseResult } from '@boluo/interpreter';
import { type ComposeAtom } from '../../hooks/useComposeAtom';
import { chatAtom } from '../../state/chat.atoms';
import * as L from 'list';
import { useDefaultInGame } from '../../hooks/useDefaultInGame';
import { composeSizeAtom } from '../../state/compose.atoms';
import { COMPOSE_AUTO_MAX_HEIGHT, COMPOSE_LARGE_HEIGHT } from './composeSize';
import { type ComposeState } from '../../state/compose.reducer';

interface Props {
  myId: string;
  parsed: ParseResult;
  enterSend: boolean;
  send: () => Promise<void>;
}

const focusAction: ComposeActionUnion & { type: 'focus' } = { type: 'focus', payload: {} };
const blurAction: ComposeActionUnion & { type: 'blur' } = { type: 'blur', payload: {} };

const useEnterKeyHint = (enterSend: boolean, ref: React.RefObject<RichTextareaHandle | null>) =>
  useEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.enterKeyHint = enterSend ? 'send' : 'enter';
  }, [enterSend, ref]);

const useReflectRangeChange = (
  rangeAtom: Atom<ComposeState['range']>,
  lock: React.RefObject<boolean>,
  ref: React.RefObject<RichTextareaHandle | null>,
) => {
  const store = useStore();

  return useEffect(() => {
    return store.sub(rangeAtom, () => {
      const range = store.get(rangeAtom);
      const textArea = ref.current;
      if (!textArea) {
        return;
      }
      const [a, b] = range;
      if (textArea.selectionStart === a && textArea.selectionEnd === b) {
        return;
      }
      lock.current = true;
      setTimeout(() => {
        textArea.setSelectionRange(a, b);
        lock.current = false;
      });
    });
  }, [lock, rangeAtom, ref, store]);
};

const MAX_FIND_LENGTH = 64;

export const ComposeTextArea: FC<Props> = ({ parsed, enterSend, send, myId }) => {
  const { composeAtom, parsedAtom } = useChannelAtoms();
  const defaultInGame = useDefaultInGame();
  const ref = useRef<RichTextareaHandle | null>(null);
  const channelId = useChannelId();
  const isCompositionRef = useRef(false);
  // Avoid overriding a user-clicked caret position when focus is regained via pointer.
  const skipFocusSelectionRef = useRef(false);
  const dispatch = useSetAtom(composeAtom);
  const store = useStore();
  const size = useAtomValue(composeSizeAtom);
  const autoSize = size === 'AUTO';
  const style = useMemo(
    (): React.CSSProperties => ({
      width: '100%',
      height: !autoSize ? COMPOSE_LARGE_HEIGHT : undefined,
      maxHeight: !autoSize ? COMPOSE_LARGE_HEIGHT : COMPOSE_AUTO_MAX_HEIGHT,
      scrollbarWidth: 'none',
      WebkitTextSizeAdjust: 'none',
      MozTextSizeAdjust: 'none',
      textSizeAdjust: 'none',
    }),
    [autoSize],
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
  const rangeAtom = useMemo(
    () => selectAtom(composeAtom, (compose) => compose.range),
    [composeAtom],
  );
  const focused = useAtomValue(
    useMemo(() => selectAtom(composeAtom, ({ focused }) => focused), [composeAtom]),
  );
  const source = useAtomValue(
    useMemo(() => selectAtom(composeAtom, (compose) => compose.source), [composeAtom]),
  );

  const lock = useRef(false); // guards against loops when we programmatically move selection
  useEnterKeyHint(enterSend, ref);
  useReflectRangeChange(rangeAtom, lock, ref);
  useEffect(() => {
    if (!focused) return;
    const textArea = ref.current;
    if (!textArea) return;
    if (skipFocusSelectionRef.current) {
      skipFocusSelectionRef.current = false;
      return;
    }
    const compose = store.get(composeAtom);
    const [start, end] = compose.range;
    lock.current = true;
    textArea.focus();
    setTimeout(() => {
      textArea.setSelectionRange(start, end);
      lock.current = false;
    });
  }, [composeAtom, focused, store]);

  const updateRange = () => {
    startTransition(() => {
      if (lock.current) return;
      const textArea = ref.current;
      if (!textArea) return;
      const { selectionStart, selectionEnd } = textArea;
      dispatch({ type: 'setRange', payload: { range: [selectionStart, selectionEnd] } });
    });
  };

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

  const handleCompositionStart = () => {
    isCompositionRef.current = true;
    dispatch({ type: 'compositionStart', payload: {} });
  };

  const handleCompositionEnd = () => {
    isCompositionRef.current = false;
    dispatch({ type: 'compositionEnd', payload: {} });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isCompositionRef.current) {
      return;
    }
    const compose = store.get(composeAtom);
    if (e.code === 'Escape') {
      e.preventDefault();
      dispatch({
        type: 'toggleInGame',
        payload: { defaultInGame },
      });
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
        void send();
      }
    } else {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        void send();
      }
    }
  };

  const handlePointerDown: PointerEventHandler<HTMLTextAreaElement> = () => {
    const textArea = ref.current;
    if (!textArea) return;
    // Only skip selection restoration when the textarea is not already focused.
    skipFocusSelectionRef.current = textArea !== document.activeElement;
  };
  return (
    <RichTextarea
      ref={ref}
      value={source}
      onChange={handleChange}
      onFocus={() => dispatch(focusAction)}
      onBlur={() => dispatch(blurAction)}
      onPasteCapture={handlePaste}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={handleKeyDown}
      data-variant="normal"
      onPointerDown={handlePointerDown}
      onSelectionChange={updateRange}
      style={style}
      autoHeight={autoSize}
      rows={1}
      className="resize-none px-2 py-2 outline-none"
    >
      {composeRender(parsed)}
    </RichTextarea>
  );
};
