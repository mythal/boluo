import { GetMe } from 'api';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { selectAtom } from 'jotai/utils';
import {
  ChangeEventHandler,
  FC,
  FocusEventHandler,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useChannelId } from '../../hooks/useChannelId';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { useSettings } from '../../hooks/useSettings';
import { makeComposeAction } from '../../state/compose.actions';
import { useSend } from '../channel/useSend';
import { useWorkerParse } from './useWorkerParse';

interface Props {
  me: GetMe;
}

export const ComposeTextArea: FC<Props> = ({ me }) => {
  const send = useSend(me.user);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const channelId = useChannelId();
  const isCompositionRef = useRef(false);
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const source = useAtomValue(useMemo(() => selectAtom(composeAtom, (compose) => compose.source), [composeAtom]));
  const store = useStore();
  const rangeAtom = useMemo(() => selectAtom(composeAtom, compose => compose.range), [composeAtom]);
  const settings = useSettings();
  useWorkerParse(dispatch, source);
  const lock = useRef(false);
  const updateRangeTimeout = useRef<number | undefined>(undefined);

  const updateRange = useCallback(
    () => {
      window.clearTimeout(updateRangeTimeout.current);
      updateRangeTimeout.current = window.setTimeout(() => {
        if (lock.current) return;
        const textArea = ref.current;
        if (!textArea) return;
        const { selectionStart, selectionEnd } = textArea;
        dispatch(makeComposeAction('setRange', { range: [selectionStart, selectionEnd] }));
      }, 20);
    },
    [dispatch],
  );

  useEffect(() =>
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
    }), [rangeAtom, store]);

  const handleChange: ChangeEventHandler<HTMLTextAreaElement> = useCallback((e) => {
    const { value } = e.target;
    updateRange();
    dispatch(
      makeComposeAction('setSource', { channelId, source: value }),
    );
  }, [channelId, dispatch, updateRange]);
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

  const handleKeyDown = useCallback(async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') {
      return;
    }
    if (settings.enterSend) {
      if (!e.shiftKey) {
        await send();
      }
    } else {
      if (e.ctrlKey || e.metaKey) {
        await send();
      }
    }
  }, [send, settings.enterSend]);
  return (
    <textarea
      ref={ref}
      value={source}
      onChange={handleChange}
      onCompositionStart={() => (isCompositionRef.current = true)}
      onCompositionEnd={() => (isCompositionRef.current = false)}
      onKeyDown={handleKeyDown}
      className="input input-default w-full h-full resize-none"
    >
    </textarea>
  );
};
