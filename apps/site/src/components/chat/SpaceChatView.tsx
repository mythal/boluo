import type { Space } from 'api';
import { FC, useContext } from 'react';
import { useMemo } from 'react';
import { FocusPaneContext } from '../../state/chat-view';
import type { Pane } from '../../types/chat-pane';
import { PaneEmpty } from './PaneEmpty';
import { ChatPaneSwitch } from './PaneSwitch';
import { ChatSiderbar } from './sidebar/ChatSidebar';

interface Props {
  space: Space;
  panes: Pane[];
}

export const SpaceChatView: FC<Props> = ({ space, panes }) => {
  const focused = useContext(FocusPaneContext);
  const sidebar = useMemo(
    () => (
      <ChatSiderbar
        key={space.id}
        space={space}
        panes={panes}
      />
    ),
    [space, panes],
  );

  const chatBody = useMemo(() => {
    if (panes.length === 0) {
      return <PaneEmpty />;
    }
    return panes.map((pane) => <ChatPaneSwitch key={pane.id} pane={pane} />);
  }, [panes]);

  const templates: string | undefined = useMemo(() => {
    if (panes.length < 2) {
      return undefined;
    }
    return panes
      .map(pane => pane.id === focused ? 'var(--pane-header-height) 1fr' : 'var(--pane-header-height)')
      .join(' ');
  }, [focused, panes]);

  const style = { '--pane-grid-rows': templates } as React.CSSProperties;
  return (
    <div className="chat-grid bg-surface-300 gap-x-[1px]" style={style}>
      {sidebar}
      {chatBody}
    </div>
  );
};
