import type { Space } from 'api';
import { FC, useContext } from 'react';
import { useMemo } from 'react';
import { FocusPaneContext } from '../state/chat-view';
import type { Pane } from '../types/chat-pane';
import { PaneEmpty } from './PaneEmpty';
import { ChatPaneSwitch } from './PaneSwitch';
import { Sidebar } from './sidebar/Sidebar';

interface Props {
  space: Space;
  panes: Pane[];
}

export const SpaceChatView: FC<Props> = ({ space, panes }) => {
  const chatBody = useMemo(() => {
    if (panes.length === 0) {
      return <PaneEmpty />;
    }
    return panes.map((pane) => <ChatPaneSwitch key={pane.id} pane={pane} />);
  }, [panes]);

  return (
    <div className="flex h-screen">
      <Sidebar
        className="flex flex-col h-full flex-none border-r border-surface-300"
        key={space.id}
        space={space}
        panes={panes}
      />
      <div className="flex-[1_0] h-full flex max-md:flex-col flex-nowrap overflow-y-hidden max-md:overflow-y-hidden md:overflow-x-auto md:divide-x">
        {chatBody}
      </div>
    </div>
  );
};
