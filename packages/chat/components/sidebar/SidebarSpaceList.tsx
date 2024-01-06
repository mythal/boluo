import { Space } from 'api';
import { useQueryMySpaces } from 'common';
import { Plus } from 'icons';
import { useAtomValue } from 'jotai';
import { FC, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { useSpace } from '../../hooks/useSpace';
import { useSwitchSpace } from '../../hooks/useSwitchSpace';
import { panesAtom } from '../../state/view.atoms';
import { SidebarItem } from './SidebarItem';
import { SidebarItemSkeleton } from './SidebarItemSkeleton';

interface Props {}

const SidebarSpaceItem: FC<{ space: Space }> = ({ space }) => {
  const currentSpace = useSpace();
  const switchSpace = useSwitchSpace();
  return (
    <SidebarItem onClick={() => switchSpace(space.id)} active={currentSpace?.id === space.id}>
      {space.name}
    </SidebarItem>
  );
};

export const SidebarSpaceList: FC<Props> = () => {
  const { data: spacesWithMemberData } = useQueryMySpaces();
  const panes = useAtomValue(panesAtom);

  const togglePane = usePaneToggle();
  const isCreateSpacePaneOpened = useMemo(
    () => panes.findIndex((pane) => pane.type === 'CREATE_SPACE') !== -1,
    [panes],
  );
  const handleToggleCreateSpacePane = () => togglePane({ type: 'CREATE_SPACE' });
  return (
    <div>
      <div className="text-surface-600 flex items-center justify-between px-3 py-2 text-sm">
        <span>
          <FormattedMessage defaultMessage="Switch Spaces" />
        </span>
      </div>
      {spacesWithMemberData == null && <SidebarItemSkeleton />}
      {spacesWithMemberData?.map(({ space }) => <SidebarSpaceItem key={space.id} space={space} />)}
      <SidebarItem icon={<Plus />} toggle active={isCreateSpacePaneOpened} onClick={handleToggleCreateSpacePane}>
        <span className="text-surface-400 group-hover:text-surface-800">
          <FormattedMessage defaultMessage="Add New" />
        </span>
      </SidebarItem>
    </div>
  );
};
