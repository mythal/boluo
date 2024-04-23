import { Space, User } from '@boluo/api';
import { useQueryMySpaces } from '@boluo/common';
import { Plus } from '@boluo/icons';
import { useAtomValue } from 'jotai';
import { FC, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { useSwitchSpace } from '../../hooks/useSwitchSpace';
import { panesAtom } from '../../state/view.atoms';
import { SidebarItem } from './SidebarItem';
import { SidebarItemSkeleton } from './SidebarItemSkeleton';
import clsx from 'clsx';

interface Props {
  currentSpaceId: string | null;
  currentUser: User | null | undefined;
}

const SidebarSpaceItem: FC<{ space: Space; currentSpaceId: string | null }> = ({ space, currentSpaceId }) => {
  const switchSpace = useSwitchSpace();
  const isCurrent = currentSpaceId === space.id;
  return (
    <div className="px-2 py-1">
      <button onClick={() => switchSpace(space.id)} className="hover:bg-surface-100 w-full px-1 py-1 text-left">
        <div className={isCurrent ? 'text-surface-900' : 'text-surface-600'}>{space.name}</div>
        <div
          className={clsx(
            'w-full overflow-hidden text-ellipsis text-nowrap text-xs',
            isCurrent ? 'text-surface-700' : 'text-surface-500',
          )}
        >
          {space.description}
        </div>
      </button>
    </div>
  );
};

export const SidebarSpaceList: FC<Props> = ({ currentUser, currentSpaceId }) => {
  const { data: spacesWithMemberData, error, isLoading } = useQueryMySpaces();
  const panes = useAtomValue(panesAtom);

  const togglePane = usePaneToggle();
  const isCreateSpacePaneOpened = useMemo(
    () => panes.findIndex((pane) => pane.type === 'CREATE_SPACE') !== -1,
    [panes],
  );
  const handleToggleCreateSpacePane = () => togglePane({ type: 'CREATE_SPACE' });
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="text-surface-600 flex items-center justify-between px-3 py-2 text-sm">
        <span>
          <FormattedMessage defaultMessage="Switch Spaces" />
        </span>
      </div>
      {spacesWithMemberData == null && isLoading && <SidebarItemSkeleton />}
      {spacesWithMemberData == null || spacesWithMemberData.length === 0 ? (
        <SidebarItem>
          <div className="text-text-lighter text-center">- Ø -</div>
        </SidebarItem>
      ) : (
        spacesWithMemberData.map(({ space }) => (
          <SidebarSpaceItem key={space.id} space={space} currentSpaceId={currentSpaceId} />
        ))
      )}
      {currentUser != null && (
        <SidebarItem icon={<Plus />} toggle active={isCreateSpacePaneOpened} onClick={handleToggleCreateSpacePane}>
          <span className="text-surface-400 group-hover:text-surface-800">
            <FormattedMessage defaultMessage="New Space" />
          </span>
        </SidebarItem>
      )}
    </div>
  );
};
