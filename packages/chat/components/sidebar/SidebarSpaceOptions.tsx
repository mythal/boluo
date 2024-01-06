import type { Space } from 'api';
import { useMe } from 'common';
import { Portal, Settings, Shuffle, Tool, Users } from 'icons';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import type { FC } from 'react';
import { useState } from 'react';
import { useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { useMySpaceMember } from '../../hooks/useQueryMySpaceMember';
import { sidebarContentStateAtom } from '../../state/ui.atoms';
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
  const spaceSettingsActive = useMemo(() => panes.findIndex((pane) => pane.type === 'SPACE_SETTINGS') !== -1, [panes]);
  const spaceMembersActive = useMemo(() => panes.findIndex((pane) => pane.type === 'SPACE_MEMBERS') !== -1, [panes]);
  const [sidebarState, setSidebarState] = useAtom(sidebarContentStateAtom);
  const handleToggle = () => {
    if (!disabled) {
      setFold((folded) => !folded);
    }
  };

  const handleClickSwitchSpace = () => {
    setSidebarState((prevState) => (prevState === 'SPACES' ? 'CHANNELS' : 'SPACES'));
  };
  return (
    <div className="">
      <SidebarGroupHeader disabled={disabled} folded={folded} toggle={handleToggle} icon={Tool}>
        <div className="break-all">{space.name}</div>
      </SidebarGroupHeader>

      {!folded && (
        <div className="pb-2">
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

          <SidebarItem icon={<Users />} active={spaceMembersActive} onClick={() => togglePane(spaceMembersPane)} toggle>
            <FormattedMessage defaultMessage="Members" />
          </SidebarItem>

          <SidebarItem icon={<Shuffle />} onClick={handleClickSwitchSpace} active={sidebarState === 'SPACES'} toggle>
            <FormattedMessage defaultMessage="Switch Space" />
          </SidebarItem>
        </div>
      )}
    </div>
  );
};
