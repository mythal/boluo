import type { Space } from 'boluo-api';
import type { FC } from 'react';
import { useCallback, useState } from 'react';
import { useMemo } from 'react';
import { toggle } from '../../helper/function';
import type { Pane } from '../../types/ChatPane';
import { PaneEmpty } from './PaneEmpty';
import { ChatPaneSwitch } from './PaneSwitch';
import { ChatSiderbar } from './sidebar/ChatSidebar';

interface Props {
  space: Space;
  panes: Pane[];
  focused: string | null;
}

export const ChatView: FC<Props> = ({ space, panes, focused }) => {
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
