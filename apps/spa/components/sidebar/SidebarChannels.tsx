import { ArrowDownWideShort, Plus } from '@boluo/icons';
import { useAtomValue } from 'jotai';
import type { FC } from 'react';
import React, { Suspense, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { usePaneToggle } from '../../hooks/usePaneToggle';
import { useQueryChannelList } from '../../hooks/useQueryChannelList';
import { useMySpaceMember } from '../../hooks/useQueryMySpaceMember';
import { panesAtom } from '../../state/view.atoms';
import { SidebarItem } from './SidebarItem';
import Icon from '@boluo/ui/Icon';
import { SidebarChannelListSkeleton } from './SidebarChannelListSkeleton';
import clsx from 'clsx';

const SidebarChannelList = React.lazy(() => import('./SidebarChannelList'));

interface Props {
  spaceId: string;
}

export const SidebarChannels: FC<Props> = ({ spaceId }) => {
  const panes = useAtomValue(panesAtom);
  const [isReordering, setIsReordering] = useState(false);
  const { data: mySpaceMember } = useMySpaceMember(spaceId);
  const { data: channelWithMemberList } = useQueryChannelList(spaceId);
  const togglePane = usePaneToggle();
  const toggleCreateChannelPane = () => {
    togglePane({ type: 'CREATE_CHANNEL', spaceId });
  };
  const isCreateChannelPaneOpened = useMemo(
    () => panes.find((pane) => pane.type === 'CREATE_CHANNEL') !== undefined,
    [panes],
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="text-text-secondary flex items-center gap-2 px-4 py-2 text-sm">
        <div className="grow">
          <FormattedMessage defaultMessage="Channels" />
        </div>

        {mySpaceMember?.isAdmin && (
          <button
            aria-pressed={isReordering}
            className={clsx(
              'text-action-toggle-text rounded-sm px-1 transition-colors',
              isReordering
                ? 'bg-action-toggle-selected-bg shadow-inner'
                : 'bg-action-toggle-bg hover:bg-action-toggle-bg-hover text-text-muted hover:text-text-primary shadow-sm',
            )}
            onClick={() => setIsReordering((prev) => !prev)}
          >
            <Icon icon={ArrowDownWideShort} className="mr-1" />
            <span className="text-xs">
              <FormattedMessage defaultMessage="Reorder" />
            </span>
          </button>
        )}
      </div>
      <Suspense fallback={<SidebarChannelListSkeleton />}>
        {channelWithMemberList == null ? (
          <SidebarChannelListSkeleton />
        ) : (
          <SidebarChannelList
            spaceId={spaceId}
            channelWithMemberList={channelWithMemberList}
            isReordering={isReordering}
          />
        )}
      </Suspense>
      {mySpaceMember?.isAdmin && (
        <SidebarItem
          icon={<Plus />}
          toggle
          active={isCreateChannelPaneOpened}
          onClick={toggleCreateChannelPane}
        >
          <span className="text-text-subtle group-hover:text-text-primary">
            <FormattedMessage defaultMessage="Add New" />
          </span>
        </SidebarItem>
      )}
    </div>
  );
};
