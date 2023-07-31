import type { Space } from 'api';
import { useMe } from 'common';
import { Settings, Tool, Users } from 'icons';
import { useAtomValue } from 'jotai';
import type { FC } from 'react';
import { useState } from 'react';
import { useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { useMySpaceMember } from '../../hooks/useMySpaceMember';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { panesAtom } from '../../state/view.atoms';
import { SpaceMembersPane, SpaceSettingsPane } from '../../state/view.types';
import { SidebarGroupHeader } from './SidebarGroupHeader';
import { SidebarItem } from './SidebarItem';

interface Props {
  space: Space;
}

export const SpaceOptions: FC<Props> = ({ space }) => {
  const panes = useAtomValue(panesAtom);
  const me = useMe();
  const { data: mySpaceMember } = useMySpaceMember(space.id);
  const disabled = me === null;
  const [folded, setFold] = useState(true);
  const togglePane = usePaneToggle();
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
        icon={Tool}
      >
        <div className="break-all">
          {space.name}
        </div>
      </SidebarGroupHeader>

      {!folded && (
        <div className="">
          {mySpaceMember?.isAdmin && (
            <SidebarItem
              icon={<Settings />}
              active={spaceSettingsActive}
              onClick={() => togglePane(spaceSettingsPane)}
              toggle
            >
              <FormattedMessage defaultMessage="Space Settings" />
            </SidebarItem>
          )}

          <SidebarItem
            icon={<Users />}
            active={spaceMembersActive}
            onClick={() => togglePane(spaceMembersPane)}
            toggle
          >
            <FormattedMessage defaultMessage="Members" />
          </SidebarItem>
        </div>
      )}
    </div>
  );
};
