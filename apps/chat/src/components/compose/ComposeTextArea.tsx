import { GetMe } from 'api';
import { useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { ChangeEventHandler, FC, FocusEventHandler, KeyboardEvent, useCallback, useMemo, useRef } from 'react';
import { useChannelId } from '../../hooks/useChannelId';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { useSettings } from '../../hooks/useSettings';
import { makeComposeAction } from '../../state/actions/compose';
import { useSend } from '../channel/useSend';

interface Props {
  me: GetMe;
}

export const ComposeTextArea: FC<Props> = ({ me }) => {
  const send = useSend(me.user);
  const channelId = useChannelId();
  const isCompositionRef = useRef(false);
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const source = useAtomValue(useMemo(() => selectAtom(composeAtom, (compose) => compose.source), [composeAtom]));
  const settings = useSettings();

  const handleChange: ChangeEventHandler<HTMLTextAreaElement> = useCallback((e) => {
    const { value, selectionStart, selectionEnd } = e.target;
    dispatch(makeComposeAction('setSource', { channelId, source: value, range: [selectionStart, selectionEnd] }));
  }, [channelId, dispatch]);
  const handleFocus: FocusEventHandler<HTMLTextAreaElement> = useCallback((e) => {
    const { selectionStart, selectionEnd } = e.target;
    dispatch(makeComposeAction('setRange', { range: [selectionStart, selectionEnd] }));
  }, [dispatch]);

  const handleBlur = useCallback(() => {
    dispatch(makeComposeAction('setRange', { range: null }));
  }, [dispatch]);

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
      value={source}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      onCompositionStart={() => (isCompositionRef.current = true)}
      onCompositionEnd={() => (isCompositionRef.current = false)}
      onKeyDown={handleKeyDown}
      className="input input-default w-full h-full resize-none"
    >
    </textarea>
  );
};
