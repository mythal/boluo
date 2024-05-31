import { useAtomValue } from 'jotai';
import { type FC, type ReactNode } from 'react';
import { useMemo } from 'react';
import { useSendStatus } from '../hooks/useSendStatus';
import { panesAtom } from '../state/view.atoms';
import { PaneEmpty } from './PaneEmpty';
import { ChatPaneSwitch } from './PaneSwitch';
import { usePaneLimit } from '../hooks/useMaxPane';

interface Props {
  defaultPane?: ReactNode;
}

export const ChatView: FC<Props> = ({ defaultPane }) => {
  useSendStatus();
  const panes = useAtomValue(panesAtom);
  const maxPane = usePaneLimit();
  return useMemo(() => {
    if (panes.length === 0) {
      return <>{defaultPane || <PaneEmpty />}</>;
    }
    return <>{panes.map((pane) => <ChatPaneSwitch key={pane.key} pane={pane} />).slice(0, maxPane)}</>;
  }, [defaultPane, maxPane, panes]);
};
