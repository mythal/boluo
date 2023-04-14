import { useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { FC, KeyboardEvent, useCallback, useMemo, useRef } from 'react';
import { useChannelId } from '../../hooks/useChannelId';
import { useComposeAtom } from '../../hooks/useComposeAtom';
import { useSettings } from '../../hooks/useSettings';
import { makeComposeAction } from '../../state/actions/compose';
import { useSend } from '../channel/useSend';

interface Props {
}

export const ComposeTextArea: FC<Props> = ({}) => {
  const send = useSend();
  const channelId = useChannelId();
  const isCompositionRef = useRef(false);
  const composeAtom = useComposeAtom();
  const dispatch = useSetAtom(composeAtom);
  const source = useAtomValue(useMemo(() => selectAtom(composeAtom, (compose) => compose.source), [composeAtom]));
  const settings = useSettings();

  const setSource = useCallback(
    (source: string) => dispatch(makeComposeAction('setSource', { channelId, source })),
    [channelId, dispatch],
  );
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') {
      return;
    }
    if (settings.enterSend) {
      if (!e.shiftKey) {
        send();
      }
    } else {
      if (e.ctrlKey || e.metaKey) {
        send();
      }
    }
  }, [send, settings.enterSend]);
  return (
    <textarea
      value={source}
      onChange={(e) => setSource(e.target.value)}
      onCompositionStart={() => (isCompositionRef.current = true)}
      onCompositionEnd={() => (isCompositionRef.current = false)}
      onKeyDown={handleKeyDown}
      className="input input-default w-full h-full resize-none"
    >
    </textarea>
  );
};
