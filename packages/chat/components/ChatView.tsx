import { useAtomValue } from 'jotai';
import { FC, ReactNode } from 'react';
import { useMemo } from 'react';
import { useSendStatus } from '../hooks/useSendStatus';
import { panesAtom } from '../state/view.atoms';
import { PaneEmpty } from './PaneEmpty';
import { ChatPaneSwitch } from './PaneSwitch';

interface Props {
  defaultPane?: ReactNode;
}

export const ChatView: FC<Props> = ({ defaultPane }) => {
  useSendStatus();
  const panes = useAtomValue(panesAtom);
  return useMemo(() => {
    if (panes.length === 0) {
      return <>{defaultPane || <PaneEmpty />}</>;
    }
    return <>{panes.map((pane) => <ChatPaneSwitch key={pane.key} pane={pane} />)}</>;
  }, [defaultPane, panes]);
};
