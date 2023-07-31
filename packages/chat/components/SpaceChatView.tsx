import type { Space } from 'api';
import { useAtomValue } from 'jotai';
import { FC } from 'react';
import { useMemo } from 'react';
import { store } from 'store';
import { isSidebarExpandedAtom } from '../state/ui.atoms';
import { panesAtom } from '../state/view.atoms';
import { PaneEmpty } from './PaneEmpty';
import { ChatPaneSwitch } from './PaneSwitch';
import { Sidebar } from './sidebar/Sidebar';

interface Props {
  space: Space;
}

export const SpaceChatView: FC<Props> = ({ space }) => {
  const panes = useAtomValue(panesAtom);
  const chatBody = useMemo(() => {
    if (panes.length === 0) {
      return <PaneEmpty />;
    }
    return panes.map((pane) => <ChatPaneSwitch key={pane.key} pane={pane} />);
  }, [panes]);
  const handleTouch = () => {
    if (window.innerWidth < 560) {
      // Auto fold sidebar
      store.set(isSidebarExpandedAtom, false);
    }
  };
  return (
    <div className="flex view-height">
      <Sidebar
        className="flex flex-col h-full flex-none border-r bg-lowest border-surface-300"
        key={space.id}
        space={space}
      />
      <div
        onTouchStart={handleTouch}
        className="flex-[1_0] h-full flex max-md:flex-col flex-nowrap overflow-y-hidden max-md:overflow-y-hidden md:overflow-x-auto md:divide-x"
      >
        {chatBody}
      </div>
    </div>
  );
};
