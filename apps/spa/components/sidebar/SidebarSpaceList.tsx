import { type Space, type User } from '@boluo/api';
import { useQueryMySpaces } from '@boluo/hooks/useQueryMySpaces';
import { Plus } from '@boluo/icons';
import { useAtomValue } from 'jotai';
import { type FC, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { useSwitchSpace } from '../../hooks/useSwitchSpace';
import { panesAtom } from '../../state/view.atoms';
import { findPane } from '../../state/view.utils';
import { SidebarItem } from './SidebarItem';
import { SidebarSkeletonItem } from './SidebarSkeletonItem';
import { SidebarSpacesHeaderNewSpace } from './SidebarSpacesHeaderNewSpace';
import clsx from 'clsx';

interface Props {
  currentSpaceId: string | null;
  currentUser: User | null | undefined;
}

const SidebarSpaceItem: FC<{ space: Space; currentSpaceId: string | null }> = ({
  space,
  currentSpaceId,
}) => {
  const switchSpace = useSwitchSpace();
  const isCurrent = currentSpaceId === space.id;
  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    e.preventDefault();
    switchSpace(space.id);
  };
  return (
    <div className="px-3 py-1">
      <a
        href={`#route=${space.id}`}
        onClick={handleClick}
        className={clsx(
          'block w-full rounded px-2 py-1 text-left',
          isCurrent ? 'bg-sidebar-item-active-bg' : 'hover:bg-sidebar-item-hover-bg',
        )}
      >
        <div className={`truncate ${isCurrent ? '' : 'text-text-secondary'}`}>{space.name}</div>
        <div
          className={clsx(
            'w-full overflow-hidden text-xs text-nowrap text-ellipsis',
            isCurrent ? 'text-text-secondary' : 'text-text-muted',
          )}
        >
          {space.description || '-'}
        </div>
      </a>
    </div>
  );
};

export const SidebarSpaceList: FC<Props> = ({ currentUser, currentSpaceId }) => {
  const { data: spacesWithMemberData, isLoading } = useQueryMySpaces();
  const panes = useAtomValue(panesAtom);

  const togglePane = usePaneToggle();
  const isCreateSpacePaneOpened = useMemo(
    () => findPane(panes, (pane) => pane.type === 'CREATE_SPACE') !== null,
    [panes],
  );
  const handleToggleCreateSpacePane = () => togglePane({ type: 'CREATE_SPACE' });
  return (
    <div className="SidebarSpaceList flex-1 overflow-y-auto">
      <div className="text-text-secondary h-pane-header flex items-center justify-between px-4 py-2 text-sm">
        <span>
          <FormattedMessage defaultMessage="My Spaces" />
        </span>
        {currentUser != null && <SidebarSpacesHeaderNewSpace />}
      </div>
      {spacesWithMemberData == null && isLoading && (
        <div>
          <SidebarSkeletonItem />
          <SidebarSkeletonItem />
        </div>
      )}
      {spacesWithMemberData == null || spacesWithMemberData.length === 0 ? (
        <SidebarItem>
          <div className="text-text-muted text-center">- Ø -</div>
        </SidebarItem>
      ) : (
        spacesWithMemberData.map(({ space }) => (
          <SidebarSpaceItem key={space.id} space={space} currentSpaceId={currentSpaceId} />
        ))
      )}
      {currentUser != null && (
        <SidebarItem
          icon={<Plus />}
          toggle
          active={isCreateSpacePaneOpened}
          onClick={handleToggleCreateSpacePane}
        >
          <span className="">
            <FormattedMessage defaultMessage="New Space" />
          </span>
        </SidebarItem>
      )}
    </div>
  );
};
