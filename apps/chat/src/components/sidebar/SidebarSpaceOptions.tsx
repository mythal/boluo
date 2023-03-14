import type { Space } from 'api';
import clsx from 'clsx';
import { useMe } from 'common';
import { ChevronDown, ChevronUp, Settings, Users } from 'icons';
import type { FC } from 'react';
import { useState } from 'react';
import { useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { useChatPaneDispatch } from '../../state/chat-view';
import { makePane, Pane, SpaceMembersPane, SpaceSettingsPane } from '../../types/chat-pane';
import { SidebarGroupHeader } from './SidebarGroupHeader';
import { SidebarItem } from './SidebarItem';

interface Props {
  space: Space;
  panes: Pane[];
}

export const SpaceOptions: FC<Props> = ({ space, panes }) => {
  const dispatch = useChatPaneDispatch();
  const me = useMe();
  const disabled = me === null;
  const [folded, setFold] = useState(true);
  const spaceSettingsPane: SpaceSettingsPane = { type: 'SPACE_SETTINGS', spaceId: space.id };
  const spaceMembersPane: SpaceMembersPane = { type: 'SPACE_MEMBERS', spaceId: space.id };
  const spaceSettingsActive = useMemo(() => panes.findIndex(pane => pane.type === 'SPACE_SETTINGS') !== -1, [panes]);
  const spaceMembersActive = useMemo(() => panes.findIndex(pane => pane.type === 'SPACE_MEMBERS') !== -1, [panes]);
  const handleToggle = () => {
    if (!disabled) {
      setFold(folded => !folded);
    }
  };
  return (
    <div className="">
      <SidebarGroupHeader
        disabled={disabled}
        folded={folded}
        toggle={handleToggle}
      >
        <div className="overflow-hidden whitespace-nowrap text-ellipsis min-w-0">
          {space.name}
        </div>
      </SidebarGroupHeader>

      {!folded && (
        <div className="">
          <SidebarItem
            icon={<Settings />}
            active={spaceSettingsActive}
            onClick={() => dispatch({ type: 'TOGGLE', pane: makePane(spaceSettingsPane) })}
            toggle
          >
            <FormattedMessage defaultMessage="Space Settings" />
          </SidebarItem>

          <SidebarItem
            icon={<Users />}
            active={spaceMembersActive}
            onClick={() => dispatch({ type: 'TOGGLE', pane: makePane(spaceMembersPane) })}
            toggle
          >
            <FormattedMessage defaultMessage="Members" />
          </SidebarItem>
        </div>
      )}
    </div>
  );
};
