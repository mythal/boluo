import { useAtomValue } from 'jotai';
import { FC, ReactNode } from 'react';
import { useMemo } from 'react';
import { store } from 'store';
import { isSidebarExpandedAtom } from '../state/ui.atoms';
import { panesAtom } from '../state/view.atoms';
import { PaneEmpty } from './PaneEmpty';
import { ChatPaneSwitch } from './PaneSwitch';
import { Sidebar } from './sidebar/Sidebar';

interface Props {
  defaultPane?: ReactNode;
}

export const ChatView: FC<Props> = ({ defaultPane }) => {
  const panes = useAtomValue(panesAtom);
  const chatBody = useMemo(() => {
    if (panes.length === 0) {
      return defaultPane || <PaneEmpty />;
    }
    return panes.map((pane) => <ChatPaneSwitch key={pane.key} pane={pane} />);
  }, [defaultPane, panes]);
  const handleTouch = () => {
    if (window.innerWidth < 560) {
      // Auto fold sidebar
      store.set(isSidebarExpandedAtom, false);
    }
  };
  return (
    <div className="flex view-height">
      <Sidebar className="flex flex-col h-full flex-none border-r bg-lowest border-surface-300" />
      <div
        onTouchStart={handleTouch}
        className="flex-[1_0] h-full flex max-md:flex-col flex-nowrap overflow-y-hidden max-md:overflow-y-hidden md:overflow-x-auto md:divide-x"
      >
        {chatBody}
      </div>
    </div>
  );
};
